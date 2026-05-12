package pt.ua.deti.apieasyspot.analytics.repository;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pt.ua.deti.apieasyspot.analytics.dto.DailyUptimeDto;
import pt.ua.deti.apieasyspot.analytics.dto.SensorStatusDto;
import pt.ua.deti.apieasyspot.analytics.dto.WorkOrderSummary;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.TextStyle;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Repository
public class TechnicianRepository {

    private final JdbcTemplate jdbc;
    private final JdbcTemplate timescaleJdbc;

    public TechnicianRepository(
            @Qualifier("jdbcTemplate") JdbcTemplate jdbc,
            @Qualifier("timescaleJdbcTemplate") JdbcTemplate timescaleJdbc) {
        this.jdbc = jdbc;
        this.timescaleJdbc = timescaleJdbc;
    }

    public int countTotalSensors() {
        Long result = jdbc.queryForObject("select count(*) from sensor_registry", Long.class);
        return result != null ? result.intValue() : 0;
    }

    public int countOperationalSensors() {
        Long result = jdbc.queryForObject(
            "select count(*) from sensor_registry where status = 'OPERATIONAL'", Long.class);
        return result != null ? result.intValue() : 0;
    }

    public long countFailuresToday() {
        Long result = timescaleJdbc.queryForObject(
            """
            select count(*) from alerts
            where type in ('SENSOR', 'SYSTEM')
              and created_at >= current_date
              and created_at < current_date + interval '1 day'
              and state != 'RESOLVED'
            """, Long.class);
        return result != null ? result : 0L;
    }

    public long countFailuresYesterday() {
        Long result = timescaleJdbc.queryForObject(
            """
            select count(*) from alerts
            where type in ('SENSOR', 'SYSTEM')
              and created_at >= current_date - interval '1 day'
              and created_at < current_date
              and state != 'RESOLVED'
            """, Long.class);
        return result != null ? result : 0L;
    }

    public Double avgMttrCurrentWeekMinutes() {
        return timescaleJdbc.queryForObject(
            """
            select avg(extract(epoch from (resolved_at - created_at)) / 60)
            from alerts
            where type in ('SENSOR', 'SYSTEM')
              and resolved_at is not null
              and resolved_at >= current_date - 7
            """, Double.class);
    }

    public Double avgMttrHistoricalMinutes() {
        return timescaleJdbc.queryForObject(
            """
            select avg(extract(epoch from (resolved_at - created_at)) / 60)
            from alerts
            where type in ('SENSOR', 'SYSTEM')
              and resolved_at is not null
              and resolved_at < current_date - 7
            """, Double.class);
    }

    public List<DailyUptimeDto> uptimeLast7Days() {
        Map<String, Long> failedByDay = timescaleJdbc.query(
            """
            select cast(created_at as date) as day,
                   count(distinct sensor_id) as failed
            from alerts
            where type = 'SENSOR'
              and sensor_id is not null
              and created_at >= current_date - 6
            group by cast(created_at as date)
            """,
            (rs, rowNum) -> Map.entry(rs.getString("day"), rs.getLong("failed"))
        ).stream().collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));

        int total = countTotalSensors();

        return timescaleJdbc.query(
            """
            select generate_series(
                (current_date - 6)::timestamp,
                current_date::timestamp,
                '1 day'::interval
            )::date as day
            """,
            (rs, rowNum) -> {
                LocalDate date = rs.getDate("day").toLocalDate();
                long failed = failedByDay.getOrDefault(date.toString(), 0L);
                double uptime = total > 0
                    ? Math.round(Math.max(total - failed, 0) * 1000.0 / total) / 10.0
                    : 0.0;
                return new DailyUptimeDto(
                    date.toString(),
                    date.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.forLanguageTag("pt-PT")),
                    uptime);
            });
    }

    public List<SensorStatusDto> sensorDistribution() {
        int total = countTotalSensors();
        return jdbc.query(
            "select status, count(*) as cnt from sensor_registry group by status",
            (rs, rowNum) -> {
                int count = rs.getInt("cnt");
                String status = rs.getString("status");
                double pct = total > 0 ? Math.round(count * 1000.0 / total) / 10.0 : 0.0;
                return new SensorStatusDto(status.toLowerCase(Locale.ROOT), statusLabel(status), count, pct);
            });
    }

    public List<WorkOrderSummary> urgentWorkOrders() {
        Map<UUID, String> parkNames = jdbc.query(
            "select id, name from parking_lots",
            (rs, rowNum) -> Map.entry(UUID.fromString(rs.getString("id")), rs.getString("name"))
        ).stream().collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));

        return timescaleJdbc.query(
            """
            select a.id, a.type, a.parking_lot_id, a.zone, a.sensor_id,
                   a.description, a.severity, a.state, a.created_at, a.attributed_to
            from alerts a
            where a.severity = 'CRITICAL'
              and a.type in ('SENSOR', 'SYSTEM')
              and a.state in ('OPEN', 'IN_PROGRESS')
            order by a.created_at desc
            limit 10
            """,
            (rs, rowNum) -> {
                String parkingLotIdStr = rs.getString("parking_lot_id");
                String parkName = "Unknown";
                if (parkingLotIdStr != null) {
                    try {
                        parkName = parkNames.getOrDefault(UUID.fromString(parkingLotIdStr), "Unknown");
                    } catch (IllegalArgumentException ignored) {
                        // malformed UUID in DB — fall back to "Unknown"
                    }
                }
                return new WorkOrderSummary(
                    UUID.fromString(rs.getString("id")),
                    rs.getString("type").toLowerCase(Locale.ROOT),
                    parkName,
                    rs.getString("zone"),
                    rs.getString("sensor_id"),
                    rs.getString("description"),
                    rs.getString("severity").toLowerCase(Locale.ROOT),
                    rs.getString("state").toLowerCase(Locale.ROOT).replace("_", "-"),
                    rs.getTimestamp("created_at").toInstant().atOffset(ZoneOffset.UTC),
                    rs.getString("attributed_to"));
            });
    }

    private String statusLabel(String status) {
        return switch (status) {
            case "OPERATIONAL" -> "Operacional";
            case "DEGRADED" -> "Degradado";
            case "OFFLINE" -> "Offline";
            default -> status;
        };
    }
}
