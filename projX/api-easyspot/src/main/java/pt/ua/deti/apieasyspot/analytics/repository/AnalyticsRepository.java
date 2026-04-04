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

    public double avgSessionDurationMinutes(){
        return jdbc.queryForObject("select avg(extract(epoch from (exit_time - entry_time))/60) from parking_sessions where cast(exit_time as date) = current_date and exit_time is not null", Double.class);
    }

    public long countOpenAlerts(){
        Long result = jdbc.queryForObject("select count(*) from alerts where estado = 'OPEN'", Long.class);
        return result != null ? result : 0L;

    }

    public int countActiveLots() {
        Long result = jdbc.queryForObject("select count(*) from parking_lots", Long.class);
        return result != null ? result.intValue() : 0;
    }

    public int[] currentOccupancy() {
        Integer[] result = jdbc.queryForObject(
            """
            select sum(occupied_count), sum(total_count)
            select (
                select distinct on (parking_lot_id, zone_type)
                    parking_lot_id, zone_type, occupied_count, total_count
                from occupancy_snapshots
                order by parking_lot_id, zone_type, recorded_at desc
            ) latest
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
            SELECT zone_type, SUM(occupied_count) AS occupied, SUM(total_count) AS total
            FROM (
                SELECT DISTINCT ON (parking_lot_id, zone_type)
                    parking_lot_id, zone_type, occupied_count, total_count
                FROM occupancy_snapshots
                ORDER BY parking_lot_id, zone_type, recorded_at DESC
            ) latest
            GROUP BY zone_type
            """,
            (rs, rowNum) -> {
                String type = rs.getString("zone_type");
                return new ZoneOccupancyDto(zoneLabel(type), type.toLowerCase(),
                    rs.getInt("total"), rs.getInt("occupied"));
            });
    }

    public List<HourlyOccupancyDto> hourlyOccupancy() {
        return jdbc.query(
            """
            select time_bucket('1 hour', recorded_at) as hour_start,
                   avg(occupied_count * 100.0 / nullif(total_count, 0)) as occupancy_pct
            from occupancy_snapshots
            where recorded_at >= CURRENT_DATE
              and recorded_at < CURRENT_DATE + interval '1 day'
            group by 1
            order by 1
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
            select a.id, a.tipo, pl.name AS parque, a.zona, a.sensor_id, a.matricula,
                   a.descricao, a.severidade, a.estado, a.criado_em, a.atribuido_a, a.notas
            from alerts a
            join parking_lots pl on pl.id = a.parking_lot_id
            order by a.criado_em desc
            limit 5
            """,
            (rs, rowNum) -> new AlertSummary(
                UUID.fromString(rs.getString("id")),
                rs.getString("tipo").toLowerCase(),
                rs.getString("parque"),
                rs.getString("zona"),
                rs.getString("sensor_id"),
                rs.getString("matricula"),
                rs.getString("descricao"),
                rs.getString("severidade").toLowerCase(),
                rs.getString("estado").toLowerCase().replace("_", "-"),
                rs.getTimestamp("criado_em").toLocalDateTime(),
                rs.getString("atribuido_a"),
                rs.getString("notas")));
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
                select distinct on (parking_lot_id, zone_type)
                    parking_lot_id, occupied_count, total_count
                from occupancy_snapshots
                order by parking_lot_id, zone_type, recorded_at desc
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
