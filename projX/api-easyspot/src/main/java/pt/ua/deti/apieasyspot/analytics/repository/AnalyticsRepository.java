package pt.ua.deti.apieasyspot.analytics.repository;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pt.ua.deti.apieasyspot.analytics.dto.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
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

    public long countEntriesToday() {
        return timescaleJdbc.queryForObject(
            "select COUNT(*) from parking_sessions where entry_time >= current_date and entry_time < current_date + interval '1 day'",
            Long.class);
    }

    public Long countEntriesYesterday() {
        return timescaleJdbc.queryForObject(
            "select count(*) from parking_sessions where entry_time >= current_date - interval '1 day' and entry_time < current_date",
            Long.class);
    }

    public BigDecimal revenueToday() {
        return timescaleJdbc.queryForObject(
            "select coalesce(sum(revenue_euros), 0) from parking_sessions where exit_time >= current_date AND exit_time < current_date + interval '1 day'",
            BigDecimal.class);
    }

    public BigDecimal revenueYesterday() {
        return timescaleJdbc.queryForObject(
            "select coalesce(sum(revenue_euros), 0) from parking_sessions where exit_time >= current_date - interval '1 day' and exit_time < current_date",
            BigDecimal.class);
    }

    public Double avgSessionDurationMinutes() {
        return timescaleJdbc.queryForObject(
            "select avg(extract(epoch from (exit_time - entry_time)) / 60) from parking_sessions where exit_time >= current_date and exit_time < current_date + interval '1 day' and exit_time is not null",
            Double.class);
    }

    public long countOpenAlerts() {
        return timescaleJdbc.queryForObject("select count(*) from alerts where state = 'OPEN'", Long.class);
    }

    public int countActiveLots() {
        return jdbc.queryForObject("select count(*) from parking_lots", Long.class).intValue();
    }

    public int[] currentOccupancy() {
        long[] result = timescaleJdbc.queryForObject(
            """
            select coalesce(sum(occupied_count), 0), coalesce(sum(total_count), 0)
            from v_latest_occupancy
            """,
            (rs, rowNum) -> new long[]{rs.getLong(1), rs.getLong(2)});
        return new int[]{(int) result[0], (int) result[1]};
    }

    public List<DailyMetric> last7DaysMetrics() {
        return timescaleJdbc.query(
            """
            select date(entry_time) as day,
                   count(*) as entries,
                   coalesce(sum(revenue_euros), 0) as revenue
            from parking_sessions
            where entry_time >= current_date - interval '6 days'
            group by date(entry_time)
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
            select date_trunc('hour', recorded_at) as hour_bucket,
                   avg(fn_occupancy_pct(occupied_count, total_count)) as occupancy_pct
            from occupancy_snapshots
            where recorded_at >= current_date
              and recorded_at < current_date + interval '1 day'
            group by date_trunc('hour', recorded_at)
            order by hour_bucket
            """,
            (rs, rowNum) -> {
                Instant hourStart = rs.getTimestamp("hour_bucket").toInstant();
                int hour = hourStart.atZone(ZoneId.of("Europe/Lisbon")).getHour();
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
            "select id, name, city from parking_lots",
            (rs, rowNum) -> Map.entry(
                UUID.fromString(rs.getString("id")),
                new String[]{rs.getString("name"), rs.getString("city")}
            )
        ).stream().collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));

        record SessionAgg(UUID parkId, long entries, BigDecimal revenue) {}
        Map<UUID, SessionAgg> sessionsByPark = timescaleJdbc.query(
            """
            select parking_lot_id,
                   count(*) as entries,
                   coalesce(sum(revenue_euros), 0) as revenue
            from parking_sessions
            where entry_time >= current_date
              and entry_time < current_date + interval '1 day'
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

        Map<UUID, Integer> occupancyByParkId = timescaleJdbc.query(
            """
            select parking_lot_id,
                   coalesce(round(avg(fn_occupancy_pct(occupied_count::int, total_count::int))), 0) as occ_pct
            from v_latest_occupancy
            group by parking_lot_id
            """,
            (rs, rowNum) -> Map.entry(UUID.fromString(rs.getString("parking_lot_id")), rs.getInt("occ_pct"))
        ).stream().collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));

        return revenueRows.stream()
            .map(row -> new ParkSummary(
                row.name(),
                row.city(),
                row.entries(),
                occupancyByParkId.getOrDefault(row.parkId(), 0),
                row.revenue()
            ))
            .toList();
    }

    private record ParkRevenueRow(UUID parkId, String name, String city, long entries, BigDecimal revenue) {}

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
