package pt.ua.deti.apieasyspot.analytics.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pt.ua.deti.apieasyspot.analytics.dto.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.TextStyle;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class AnalyticsRepository {

    private final JdbcTemplate jdbc;

    public long countEntriesToday(){
        Long result = jdbc.queryForObject("select count(*) from parking_sessions where cast(entry_time as date) = current_date", Long.class);
        return result != null ? result : 0L;
    }

    public Long countEntriesYesterday(){
        Long result = jdbc.queryForObject("select count(*) from parking_sessions where cast(entry_time as date) = current_date - 1", Long.class);
        return result != null ? result : 0L;
    }

    public BigDecimal revenueToday(){
        BigDecimal result = jdbc.queryForObject("select coalesce(sum(revenue_euros), 0) from parking_sessions where cast(exit_time as date) = current_date", BigDecimal.class);
        return result != null ? result : BigDecimal.ZERO;
    }

    public BigDecimal revenueYesterday(){
        BigDecimal result = jdbc.queryForObject("select coalesce(sum(revenue_euros), 0) from parking_sessions where cast(exit_time as date) = current_date - 1", BigDecimal.class);
        return result != null ? result : BigDecimal.ZERO;
    }

    public Double avgSessionDurationMinutes(){
        return jdbc.queryForObject("select avg(extract(epoch from (exit_time - entry_time))/60) from parking_sessions where cast(exit_time as date) = current_date and exit_time is not null", Double.class);
    }

    public long countOpenAlerts(){
        Long result = jdbc.queryForObject("select count(*) from alerts where state = 'OPEN'", Long.class);
        return result != null ? result : 0L;

    }

    public int countActiveLots() {
        Long result = jdbc.queryForObject("select count(*) from parking_lots", Long.class);
        return result != null ? result.intValue() : 0;
    }

    public int[] currentOccupancy() {
        Integer[] result = jdbc.queryForObject(
            """
            select coalesce(sum(occupied_count), 0), coalesce(sum(total_count), 0)
            from (
                select occupied_count, total_count,
                       row_number() over (
                           partition by parking_lot_id, zone_type
                           order by recorded_at desc
                       ) as rn
                from occupancy_snapshots
            ) latest
            where rn = 1
            """,
            (rs, rowNum) -> new Integer[]{
                rs.getObject(1, Integer.class),
                rs.getObject(2, Integer.class)
            });
        if (result == null || result[0] == null) return new int[]{0, 0};
        return new int[]{result[0], result[1]};
    }

    public List<DailyMetric> last7DaysMetrics(){
        return jdbc.query(
            """
                select cast(entry_time as date) as day,
                    count(*) as entries,
                    coalesce(sum(revenue_euros), 0) as revenue
                from parking_sessions
                where cast(entry_time as date) >= current_date - 6
                group by cast(entry_time as date)
                order by day
                """,
            (rs, rowNum) -> {
                LocalDate date = rs.getDate("day").toLocalDate();
                return new DailyMetric(
                    date.toString(),
                    date.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.forLanguageTag("pt-PT")),
                    rs.getLong("entries"),
                    rs.getBigDecimal("revenue").doubleValue()
                );
            }
        );
    }

    public List<ZoneOccupancyDto> zoneOccupancy() {
        return jdbc.query(
            """
            select zone_type, sum(occupied_count) as occupied, sum(total_count) as total
            from (
                select zone_type, occupied_count, total_count,
                       row_number() over (
                           partition by parking_lot_id, zone_type
                           order by recorded_at desc
                       ) as rn
                from occupancy_snapshots
            ) latest
            where rn = 1
            group by zone_type
            """,
            (rs, rowNum) -> {
                String type = rs.getString("zone_type");
                return new ZoneOccupancyDto(zoneLabel(type), type.toLowerCase(Locale.ROOT),
                    rs.getInt("total"), rs.getInt("occupied"));
            });
    }

    public List<HourlyOccupancyDto> hourlyOccupancy() {
        return jdbc.query(
            """
             select cast(recorded_at as timestamp) as hour_start,
                 avg(occupied_count * 100.0 / nullif(total_count, 0)) as occupancy_pct
            from occupancy_snapshots
            where recorded_at >= CURRENT_DATE
              and recorded_at < CURRENT_DATE + interval '1 day'
             group by cast(recorded_at as timestamp)
             order by hour_start
            """,
            (rs, rowNum) -> {
                Instant hourStart = rs.getTimestamp("hour_start").toInstant();
                int hour = hourStart.atZone(ZoneId.of("Europe/Lisbon")).getHour();
                return new HourlyOccupancyDto(
                    String.format("%02dh", hour),
                    (int) Math.round(rs.getDouble("occupancy_pct")));
            });
    }

    public List<AlertSummary> last5Alerts() {
        return jdbc.query(
            """
            select a.id, a.type, pl.name AS park, a.zone, a.sensor_id, a.plate,
                   a.description, a.severity, a.state, a.created_at, a.attributed_to, a.notes
            from alerts a
            join parking_lots pl on pl.id = a.parking_lot_id
            order by a.created_at desc
            limit 5
            """,
            (rs, rowNum) -> new AlertSummary(
                UUID.fromString(rs.getString("id")),
                rs.getString("type").toLowerCase(Locale.ROOT),
                rs.getString("park"),
                rs.getString("zone"),
                rs.getString("sensor_id"),
                rs.getString("plate"),
                rs.getString("description"),
                rs.getString("severity").toLowerCase(Locale.ROOT),
                rs.getString("state").toLowerCase(Locale.ROOT).replace("_", "-"),
                rs.getTimestamp("created_at").toLocalDateTime(),
                rs.getString("attributed_to"),
                rs.getString("notes")));
    }

    public List<ParkSummary> parkPerformance() {
        return jdbc.query(
            """
            select pl.name, pl.city,
                   count(ps.id) as entries,
                   coalesce(sum(ps.revenue_euros), 0) as revenue,
                   coalesce(round(avg(snap.occupied_count * 100.0 / nullif(snap.total_count, 0))), 0) as occ_pct
            from parking_lots pl
            left join parking_sessions ps
                on ps.parking_lot_id = pl.id and cast(ps.entry_time as date) = CURRENT_DATE
            left join(
                select parking_lot_id, occupied_count, total_count
                from (
                    select parking_lot_id, zone_type, occupied_count, total_count,
                           row_number() over (
                               partition by parking_lot_id, zone_type
                               order by recorded_at desc
                           ) as rn
                    from occupancy_snapshots
                ) latest
                where rn = 1
            ) snap on snap.parking_lot_id = pl.id
            group by pl.id, pl.name, pl.city
            order by revenue desc
            """,
            (rs, rowNum) -> new ParkSummary(
                rs.getString("name"),
                rs.getString("city"),
                rs.getLong("entries"),
                rs.getInt("occ_pct"),
                rs.getBigDecimal("revenue")));
    }

    private String zoneLabel(String zoneType) {
        return switch (zoneType) {
            case "STANDARD" -> "Normal";
            case "EV" -> "Carregamento EV";
            case "ACCESSIBLE" -> "Mobilidade Reduzida";
            case "RESERVED" -> "Reservados";
            default -> zoneType;
        };
    }
}
