package pt.ua.deti.apieasyspot.analytics.repository;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pt.ua.deti.apieasyspot.analytics.dto.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.TextStyle;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Repository
public class AnalyticsRepository {

    private final JdbcTemplate jdbc;
    private final JdbcTemplate timescaleJdbc;

    public AnalyticsRepository(
            @Qualifier("jdbcTemplate") JdbcTemplate jdbc,
            @Qualifier("timescaleJdbcTemplate") JdbcTemplate timescaleJdbc) {
        this.jdbc = jdbc;
        this.timescaleJdbc = timescaleJdbc;
    }

    private static final String TZ = "Europe/Lisbon";

    public long countEntriesToday() {
        return timescaleJdbc.queryForObject(
            "select COUNT(*) from parking_sessions where entry_time >= current_date at time zone ? and entry_time < (current_date + interval '1 day') at time zone ?",
            Long.class, TZ, TZ);
    }

    public Long countEntriesYesterday() {
        return timescaleJdbc.queryForObject(
            "select count(*) from parking_sessions where entry_time >= (current_date - interval '1 day') at time zone ? and entry_time < current_date at time zone ?",
            Long.class, TZ, TZ);
    }

    public BigDecimal revenueToday() {
        return timescaleJdbc.queryForObject(
            "select coalesce(sum(revenue_euros), 0) from parking_sessions where exit_time >= current_date at time zone ? and exit_time < (current_date + interval '1 day') at time zone ?",
            BigDecimal.class, TZ, TZ);
    }

    public BigDecimal revenueYesterday() {
        return timescaleJdbc.queryForObject(
            "select coalesce(sum(revenue_euros), 0) from parking_sessions where exit_time >= (current_date - interval '1 day') at time zone ? and exit_time < current_date at time zone ?",
            BigDecimal.class, TZ, TZ);
    }

    public Double avgSessionDurationMinutes() {
        // Rolling 24-hour window + COALESCE(exit_time, NOW()) so that:
        //  - active sessions (no exit yet) contribute their current duration
        //  - sessions started yesterday but not yet finished are included
        return timescaleJdbc.queryForObject(
            """
            select avg(extract(epoch from (coalesce(exit_time, now()) - entry_time)) / 60)
            from parking_sessions
            where entry_time >= now() - interval '24 hours'
            """,
            Double.class);
    }

    public long countOpenAlerts() {
        return timescaleJdbc.queryForObject("select count(*) from alerts where state = 'OPEN'", Long.class);
    }

    public int countActiveLots() {
        return jdbc.queryForObject("select count(*) from parking_lots", Long.class).intValue();
    }

    public int[] currentOccupancy() {
        // Query parking_spots directly — this table is updated synchronously on every sensor
        // event and is always current, unlike occupancy_snapshots which are periodic aggregates.
        Map<String, Object> row = jdbc.queryForMap(
            """
            select count(*) filter (where status not in ('free', 'ev', 'accessible', 'out_of_service')) as occupied,
                   count(*)                                                                               as total
            from parking_spots
            """
        );
        int occupied = ((Number) row.get("occupied")).intValue();
        int total    = ((Number) row.get("total")).intValue();
        return new int[]{occupied, total};
    }

    public List<DailyMetric> last7DaysMetrics() {
        return timescaleJdbc.query(
            """
            select date(entry_time at time zone 'Europe/Lisbon') as day,
                   count(*) as entries,
                   coalesce(sum(revenue_euros), 0) as revenue
            from parking_sessions
            where entry_time >= (current_date - interval '6 days') at time zone 'Europe/Lisbon'
            group by date(entry_time at time zone 'Europe/Lisbon')
            order by day
            """,
            (rs, rowNum) -> {
                LocalDate date = rs.getDate("day").toLocalDate();
                return new DailyMetric(
                    date.toString(),
                    date.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.forLanguageTag("pt-PT")),
                    rs.getLong("entries"),
                    rs.getBigDecimal("revenue").doubleValue());
            });
    }

    public List<ZoneOccupancyDto> zoneOccupancy() {
        return timescaleJdbc.query(
            """
            select zone_type, sum(occupied_count) as occupied, sum(total_count) as total
            from v_latest_occupancy
            group by zone_type
            """,
            (rs, rowNum) -> {
                String type = rs.getString("zone_type");
                return new ZoneOccupancyDto(zoneLabel(type), type.toLowerCase(Locale.ROOT),
                    rs.getInt("total"), rs.getInt("occupied"));
            });
    }

    public List<HourlyOccupancyDto> hourlyOccupancy() {
        return timescaleJdbc.query(
            """
            select date_trunc('hour', recorded_at at time zone 'Europe/Lisbon') as hour_bucket,
                   avg(fn_occupancy_pct(occupied_count, total_count)) as occupancy_pct
            from occupancy_snapshots
            where recorded_at >= current_date at time zone 'Europe/Lisbon'
              and recorded_at < (current_date + interval '1 day') at time zone 'Europe/Lisbon'
            group by date_trunc('hour', recorded_at at time zone 'Europe/Lisbon')
            order by hour_bucket
            """,
            (rs, rowNum) -> {
                int hour = rs.getTimestamp("hour_bucket").toLocalDateTime().getHour();
                return new HourlyOccupancyDto(String.format("%02dh", hour), (int) Math.round(rs.getDouble("occupancy_pct")));
            });
    }

    public List<AlertSummary> last5Alerts() {
        return timescaleJdbc.query(
            """
            select id, type, parking_lot_name as park, zone, sensor_id, plate,
                   description, photo_url, severity, state, created_at, attributed_to, notes
            from alerts
            order by created_at desc
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
                rs.getString("photo_url"),
                rs.getString("severity").toLowerCase(Locale.ROOT),
                rs.getString("state").toLowerCase(Locale.ROOT).replace("_", "-"),
                rs.getTimestamp("created_at").toInstant().atOffset(ZoneOffset.UTC),
                rs.getString("attributed_to"),
                rs.getString("notes")));
    }

    public List<ParkSummary> parkPerformance() {
        Map<UUID, String[]> lots = jdbc.query(
            "select id, name, city, total_spaces from parking_lots",
            (rs, rowNum) -> Map.entry(
                UUID.fromString(rs.getString("id")),
                new String[]{
                    rs.getString("name"),
                    rs.getString("city"),
                    String.valueOf(rs.getInt("total_spaces"))
                }
            )
        ).stream().collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));

        record SessionAgg(UUID parkId, long entries, BigDecimal revenue) {}
        Map<UUID, SessionAgg> sessionsByPark = timescaleJdbc.query(
            """
            select parking_lot_id,
                   count(*) as entries,
                   coalesce(sum(revenue_euros), 0) as revenue
            from parking_sessions
            where entry_time >= current_date at time zone 'Europe/Lisbon'
              and entry_time < (current_date + interval '1 day') at time zone 'Europe/Lisbon'
            group by parking_lot_id
            """,
            (rs, rowNum) -> new SessionAgg(
                UUID.fromString(rs.getString("parking_lot_id")),
                rs.getLong("entries"),
                rs.getBigDecimal("revenue")
            )
        ).stream().collect(Collectors.toMap(SessionAgg::parkId, a -> a));

        List<ParkRevenueRow> revenueRows = lots.entrySet().stream()
            .map(e -> {
                SessionAgg agg = sessionsByPark.getOrDefault(e.getKey(), new SessionAgg(e.getKey(), 0L, BigDecimal.ZERO));
                return new ParkRevenueRow(e.getKey(), e.getValue()[0], e.getValue()[1], agg.entries(), agg.revenue());
            })
            .sorted((a, b) -> b.revenue().compareTo(a.revenue()))
            .toList();

        // Use parking_spots directly — same real-time source as the KPI occupancy.
        Map<UUID, Long> occupiedNowByParkId = jdbc.query(
            """
            select parking_lot_id,
                   count(*) filter (where status not in ('free', 'ev', 'accessible', 'out_of_service')) as occupied_now
            from parking_spots
            group by parking_lot_id
            """,
            (rs, rowNum) -> Map.entry(UUID.fromString(rs.getString("parking_lot_id")), rs.getLong("occupied_now"))
        ).stream().collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));

        return revenueRows.stream()
            .map(row -> {
                String[] lotInfo = lots.get(row.parkId());
                int totalSpaces = 0;
                if (lotInfo != null) {
                    try {
                        totalSpaces = Integer.parseInt(lotInfo[2]);
                    } catch (NumberFormatException ex) {
                        totalSpaces = 0;
                    }
                }
                int occupiedNow = occupiedNowByParkId.getOrDefault(row.parkId(), 0L).intValue();

                return new ParkSummary(
                    row.name(),
                    row.city(),
                    row.entries(),
                    safeRate(occupiedNow, totalSpaces),
                    row.revenue()
                );
            })
            .toList();
    }

    private record ParkRevenueRow(UUID parkId, String name, String city, long entries, BigDecimal revenue) {}

    private int safeRate(int part, int total) {
        if (total <= 0) return 0;
        return (int) Math.round(part * 100.0 / total);
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
