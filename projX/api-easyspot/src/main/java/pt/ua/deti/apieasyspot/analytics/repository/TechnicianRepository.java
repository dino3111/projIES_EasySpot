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

    // ── helpers ──────────────────────────────────────────────────────────────

    /** Builds "AND col IN (?::uuid, ?::uuid, ...)" or an empty string. */
    private String parkFilter(List<UUID> parkIds, String col) {
        if (parkIds == null || parkIds.isEmpty()) return "";
        String placeholders = parkIds.stream().map(id -> "?::uuid").collect(Collectors.joining(","));
        return " AND " + col + " IN (" + placeholders + ")";
    }

    private Object[] parkParams(List<UUID> parkIds) {
        if (parkIds == null || parkIds.isEmpty()) return new Object[0];
        return parkIds.stream().map(UUID::toString).toArray();
    }

    // ── sensor counts ────────────────────────────────────────────────────────

    public int countTotalSensors(List<UUID> parkIds) {
        String sql = "SELECT count(*) FROM sensor_registry WHERE 1=1" + parkFilter(parkIds, "parking_lot_id");
        Long result = jdbc.queryForObject(sql, Long.class, parkParams(parkIds));
        return result != null ? result.intValue() : 0;
    }

    public int countOperationalSensors(List<UUID> parkIds) {
        String sql = "SELECT count(*) FROM sensor_registry WHERE status = 'OPERATIONAL'" + parkFilter(parkIds, "parking_lot_id");
        Long result = jdbc.queryForObject(sql, Long.class, parkParams(parkIds));
        return result != null ? result.intValue() : 0;
    }

    // ── failure counts ────────────────────────────────────────────────────────

    public long countFailuresToday(List<UUID> parkIds) {
        String sql = """
            SELECT count(*) FROM alerts
            WHERE type IN ('SENSOR', 'SYSTEM')
              AND created_at >= current_date at time zone 'Europe/Lisbon'
              AND created_at < (current_date + interval '1 day') at time zone 'Europe/Lisbon'
            """ + parkFilter(parkIds, "parking_lot_id");
        Long result = timescaleJdbc.queryForObject(sql, Long.class, parkParams(parkIds));
        return result != null ? result : 0L;
    }

    public long countFailuresYesterday(List<UUID> parkIds) {
        String sql = """
            SELECT count(*) FROM alerts
            WHERE type IN ('SENSOR', 'SYSTEM')
              AND created_at >= (current_date - interval '1 day') at time zone 'Europe/Lisbon'
              AND created_at < current_date at time zone 'Europe/Lisbon'
            """ + parkFilter(parkIds, "parking_lot_id");
        Long result = timescaleJdbc.queryForObject(sql, Long.class, parkParams(parkIds));
        return result != null ? result : 0L;
    }

    // ── MTTR ──────────────────────────────────────────────────────────────────

    public Double avgMttrCurrentWeekMinutes(List<UUID> parkIds) {
        String sql = """
            SELECT avg(extract(epoch from (resolved_at - created_at)) / 60)
            FROM alerts
            WHERE type IN ('SENSOR', 'SYSTEM')
              AND resolved_at IS NOT NULL
              AND resolved_at >= current_date - 7
            """ + parkFilter(parkIds, "parking_lot_id");
        return timescaleJdbc.queryForObject(sql, Double.class, parkParams(parkIds));
    }

    public Double avgMttrHistoricalMinutes(List<UUID> parkIds) {
        String sql = """
            SELECT avg(extract(epoch from (resolved_at - created_at)) / 60)
            FROM alerts
            WHERE type IN ('SENSOR', 'SYSTEM')
              AND resolved_at IS NOT NULL
              AND resolved_at < current_date - 7
            """ + parkFilter(parkIds, "parking_lot_id");
        return timescaleJdbc.queryForObject(sql, Double.class, parkParams(parkIds));
    }

    // ── uptime chart ──────────────────────────────────────────────────────────

    public List<DailyUptimeDto> uptimeLast7Days(List<UUID> parkIds, int totalSensors) {
        String failSql = """
            SELECT cast(created_at as date) as day,
                   count(distinct sensor_id) as failed
            FROM alerts
            WHERE type = 'SENSOR'
              AND sensor_id IS NOT NULL
              AND created_at >= current_date - 6
            """ + parkFilter(parkIds, "parking_lot_id") + """
             GROUP BY cast(created_at as date)
            """;

        Map<String, Long> failedByDay = timescaleJdbc.query(
            failSql,
            parkParams(parkIds),
            (rs, rowNum) -> Map.entry(rs.getString("day"), rs.getLong("failed"))
        ).stream().collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));

        return timescaleJdbc.query(
            """
            SELECT generate_series(
                (current_date - 6)::timestamp,
                current_date::timestamp,
                '1 day'::interval
            )::date AS day
            """,
            (rs, rowNum) -> {
                LocalDate date = rs.getDate("day").toLocalDate();
                long failed = failedByDay.getOrDefault(date.toString(), 0L);
                double uptime = totalSensors > 0
                    ? Math.round(Math.max(totalSensors - failed, 0) * 1000.0 / totalSensors) / 10.0
                    : 0.0;
                return new DailyUptimeDto(
                    date.toString(),
                    date.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.forLanguageTag("pt-PT")),
                    uptime);
            });
    }

    // ── sensor distribution ───────────────────────────────────────────────────

    public List<SensorStatusDto> sensorDistribution(List<UUID> parkIds, int totalSensors) {
        String sql = "SELECT status, count(*) AS cnt FROM sensor_registry WHERE 1=1"
            + parkFilter(parkIds, "parking_lot_id") + " GROUP BY status";
        return jdbc.query(
            sql,
            parkParams(parkIds),
            (rs, rowNum) -> {
                int count = rs.getInt("cnt");
                String status = rs.getString("status");
                double pct = totalSensors > 0 ? Math.round(count * 1000.0 / totalSensors) / 10.0 : 0.0;
                return new SensorStatusDto(status.toLowerCase(Locale.ROOT), statusLabel(status), count, pct);
            });
    }

    // ── urgent work orders ────────────────────────────────────────────────────

    public List<WorkOrderSummary> urgentWorkOrders(List<UUID> parkIds) {
        Map<UUID, String> parkNames;
        if (parkIds == null || parkIds.isEmpty()) {
            parkNames = Map.of();
        } else {
            String inClause = parkIds.stream().map(id -> "?::uuid").collect(Collectors.joining(","));
            parkNames = jdbc.query(
                "SELECT id, name FROM parking_lots WHERE id IN (" + inClause + ")",
                parkIds.stream().map(UUID::toString).toArray(),
                (rs, rowNum) -> Map.entry(UUID.fromString(rs.getString("id")), rs.getString("name"))
            ).stream().collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
        }

        String sql = """
            SELECT a.id, a.type, a.parking_lot_id, a.zone, a.sensor_id,
                   a.description, a.severity, a.state, a.created_at, a.attributed_to
            FROM alerts a
            WHERE a.severity = 'CRITICAL'
              AND a.type IN ('SENSOR', 'SYSTEM')
              AND a.state IN ('OPEN', 'IN_PROGRESS')
            """ + parkFilter(parkIds, "a.parking_lot_id") + """
             ORDER BY a.created_at DESC
            LIMIT 10
            """;

        return timescaleJdbc.query(
            sql,
            parkParams(parkIds),
            (rs, rowNum) -> {
                String parkingLotIdStr = rs.getString("parking_lot_id");
                String parkName = "Unknown";
                if (parkingLotIdStr != null) {
                    try {
                        parkName = parkNames.getOrDefault(UUID.fromString(parkingLotIdStr), "Unknown");
                    } catch (IllegalArgumentException ignored) {
                        // malformed UUID in DB - fall back to "Unknown"
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
            case "OPERATIONAL"  -> "Operacional";
            case "DEGRADED"     -> "Degradado";
            case "OFFLINE"      -> "Offline";
            case "MAINTENANCE"  -> "Manutenção";
            default -> status;
        };
    }
}
