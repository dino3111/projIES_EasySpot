package pt.ua.deti.apieasyspot.analytics.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pt.ua.deti.apieasyspot.analytics.dto.DailyUptimeDto;
import pt.ua.deti.apieasyspot.analytics.dto.SensorStatusDto;
import pt.ua.deti.apieasyspot.analytics.dto.WorkOrderSummary;

import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class TechnicianRepository {

    private final JdbcTemplate jdbc;

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
        Long result = jdbc.queryForObject(
            """
            select count(*) from alerts
            where type in ('SENSOR', 'SYSTEM')
              and cast(created_at as date) = current_date
              and state != 'RESOLVED'
            """, Long.class);
        return result != null ? result : 0L;
    }

    public long countFailuresYesterday() {
        Long result = jdbc.queryForObject(
            """
            select count(*) from alerts
            where type in ('SENSOR', 'SYSTEM')
              and cast(created_at as date) = current_date - 1
              and state != 'RESOLVED'
            """, Long.class);
        return result != null ? result : 0L;
    }

    public Double avgMttrCurrentWeekMinutes() {
        return jdbc.queryForObject(
            """
            select avg(extract(epoch from (resolved_at - created_at)) / 60)
            from alerts
            where type in ('SENSOR', 'SYSTEM')
              and resolved_at is not null
              and resolved_at >= current_date - 7
            """, Double.class);
    }

    public Double avgMttrHistoricalMinutes() {
        return jdbc.queryForObject(
            """
            select avg(extract(epoch from (resolved_at - created_at)) / 60)
            from alerts
            where type in ('SENSOR', 'SYSTEM')
              and resolved_at is not null
              and resolved_at < current_date - 7
            """, Double.class);
    }

    public List<DailyUptimeDto> uptimeLast7Days() {
        return jdbc.query(
            """
            with days as (
                select generate_series(
                    (current_date - 6)::timestamp,
                    current_date::timestamp,
                    '1 day'::interval
                )::date as day
            ),
            total_sensors as (
                select count(*) as cnt from sensor_registry
            ),
            daily_failures as (
                select cast(created_at as date) as day,
                       count(distinct sensor_id) as failed
                from alerts
                where type = 'SENSOR'
                  and sensor_id is not null
                  and cast(created_at as date) >= current_date - 6
                group by cast(created_at as date)
            )
            select d.day,
                   case
                       when t.cnt = 0 then 100.0
                       else round(greatest(t.cnt - coalesce(f.failed, 0), 0) * 100.0 / t.cnt, 1)
                   end as uptime_pct
            from days d
            cross join total_sensors t
            left join daily_failures f on f.day = d.day
            order by d.day
            """,
            (rs, rowNum) -> {
                LocalDate date = rs.getDate("day").toLocalDate();
                return new DailyUptimeDto(
                    date.toString(),
                    date.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.forLanguageTag("pt-PT")),
                    rs.getDouble("uptime_pct"));
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
                return new SensorStatusDto(status.toLowerCase(), statusLabel(status), count, pct);
            });
    }

    public List<WorkOrderSummary> urgentWorkOrders() {
        return jdbc.query(
            """
            select a.id, a.type, pl.name as park, a.zone, a.sensor_id,
                   a.description, a.severity, a.state, a.created_at, a.attributed_to
            from alerts a
            join parking_lots pl on pl.id = a.parking_lot_id
            where a.severity = 'CRITICAL'
              and a.type in ('SENSOR', 'SYSTEM')
              and a.state in ('OPEN', 'IN_PROGRESS')
            order by a.created_at desc
            limit 10
            """,
            (rs, rowNum) -> new WorkOrderSummary(
                UUID.fromString(rs.getString("id")),
                rs.getString("type").toLowerCase(),
                rs.getString("park"),
                rs.getString("zone"),
                rs.getString("sensor_id"),
                rs.getString("description"),
                rs.getString("severity").toLowerCase(),
                rs.getString("state").toLowerCase().replace("_", "-"),
                rs.getTimestamp("created_at").toLocalDateTime(),
                rs.getString("attributed_to")));
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
