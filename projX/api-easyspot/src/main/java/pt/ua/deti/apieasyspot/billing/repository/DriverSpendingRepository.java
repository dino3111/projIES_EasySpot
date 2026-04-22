package pt.ua.deti.apieasyspot.billing.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class DriverSpendingRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public TotalsRow totals(UUID userId, UUID vehicleId, OffsetDateTime fromInclusive, OffsetDateTime toExclusive) {
        return jdbc.queryForObject(
            """
            select
              coalesce(sum(ps.revenue_euros), 0) as total_spent,
              coalesce(sum(case when ps.zone_type = 'EV' then ps.revenue_euros else 0 end), 0) as charging_spent,
              coalesce(sum(case when ps.zone_type <> 'EV' then ps.revenue_euros else 0 end), 0) as parking_spent,
              count(*) as sessions
            from parking_sessions ps
            where ps.user_id = :userId
              and ps.entry_time >= :fromInclusive
              and ps.entry_time < :toExclusive
              and ps.exit_time is not null
              and ps.revenue_euros is not null
              and (:vehicleId is null or ps.vehicle_id = :vehicleId)
            """,
            params(userId, vehicleId, fromInclusive, toExclusive),
            (rs, row) -> new TotalsRow(
                rs.getBigDecimal("total_spent"),
                rs.getBigDecimal("charging_spent"),
                rs.getBigDecimal("parking_spent"),
                rs.getLong("sessions")
            )
        );
    }

    public List<TimeseriesPointRow> timeseries(UUID userId, UUID vehicleId, OffsetDateTime fromInclusive, OffsetDateTime toExclusive) {
        return jdbc.query(
            """
            select date(ps.entry_time) as day, coalesce(sum(ps.revenue_euros), 0) as total_spent
            from parking_sessions ps
            where ps.user_id = :userId
              and ps.entry_time >= :fromInclusive
              and ps.entry_time < :toExclusive
              and ps.exit_time is not null
              and ps.revenue_euros is not null
              and (:vehicleId is null or ps.vehicle_id = :vehicleId)
            group by date(ps.entry_time)
            order by day
            """,
            params(userId, vehicleId, fromInclusive, toExclusive),
            (rs, row) -> new TimeseriesPointRow(
                rs.getDate("day").toLocalDate(),
                rs.getBigDecimal("total_spent")
            )
        );
    }

    public List<ParkBreakdownRow> breakdownByPark(UUID userId, UUID vehicleId, OffsetDateTime fromInclusive, OffsetDateTime toExclusive) {
        return jdbc.query(
            """
            select ps.parking_lot_id, pl.name as park_name, coalesce(sum(ps.revenue_euros), 0) as total_spent
            from parking_sessions ps
            join parking_lots pl on pl.id = ps.parking_lot_id
            where ps.user_id = :userId
              and ps.entry_time >= :fromInclusive
              and ps.entry_time < :toExclusive
              and ps.exit_time is not null
              and ps.revenue_euros is not null
              and (:vehicleId is null or ps.vehicle_id = :vehicleId)
            group by ps.parking_lot_id, pl.name
            order by total_spent desc, pl.name asc
            """,
            params(userId, vehicleId, fromInclusive, toExclusive),
            (rs, row) -> new ParkBreakdownRow(
                UUID.fromString(rs.getString("parking_lot_id")),
                rs.getString("park_name"),
                rs.getBigDecimal("total_spent")
            )
        );
    }

    public List<VehicleBreakdownRow> breakdownByVehicle(UUID userId, UUID vehicleId, OffsetDateTime fromInclusive, OffsetDateTime toExclusive) {
        return jdbc.query(
            """
            select ps.vehicle_id, v.plate as license_plate, coalesce(sum(ps.revenue_euros), 0) as total_spent
            from parking_sessions ps
            join vehicles v on v.id = ps.vehicle_id
            where ps.user_id = :userId
              and ps.entry_time >= :fromInclusive
              and ps.entry_time < :toExclusive
              and ps.exit_time is not null
              and ps.revenue_euros is not null
              and ps.vehicle_id is not null
              and (:vehicleId is null or ps.vehicle_id = :vehicleId)
            group by ps.vehicle_id, v.plate
            order by total_spent desc, v.plate asc
            """,
            params(userId, vehicleId, fromInclusive, toExclusive),
            (rs, row) -> new VehicleBreakdownRow(
                UUID.fromString(rs.getString("vehicle_id")),
                rs.getString("license_plate"),
                rs.getBigDecimal("total_spent")
            )
        );
    }

    public String mostUsedPark(UUID userId, UUID vehicleId, OffsetDateTime fromInclusive, OffsetDateTime toExclusive) {
        List<String> rows = jdbc.query(
            """
            select pl.name
            from parking_sessions ps
            join parking_lots pl on pl.id = ps.parking_lot_id
            where ps.user_id = :userId
              and ps.entry_time >= :fromInclusive
              and ps.entry_time < :toExclusive
              and ps.exit_time is not null
              and ps.revenue_euros is not null
              and (:vehicleId is null or ps.vehicle_id = :vehicleId)
            group by pl.name
            order by count(*) desc, coalesce(sum(ps.revenue_euros), 0) desc, pl.name asc
            limit 1
            """,
            params(userId, vehicleId, fromInclusive, toExclusive),
            (rs, row) -> rs.getString(1)
        );
        return rows.isEmpty() ? null : rows.get(0);
    }

    public CostliestSessionRow costliestSession(UUID userId, UUID vehicleId, OffsetDateTime fromInclusive, OffsetDateTime toExclusive) {
        List<CostliestSessionRow> rows = jdbc.query(
            """
            select pl.name as park_name,
                   ps.exit_time as ended_at,
                   v.plate as vehicle,
                   ps.revenue_euros as total_spent
            from parking_sessions ps
            join parking_lots pl on pl.id = ps.parking_lot_id
            left join vehicles v on v.id = ps.vehicle_id
            where ps.user_id = :userId
              and ps.entry_time >= :fromInclusive
              and ps.entry_time < :toExclusive
              and ps.exit_time is not null
              and ps.revenue_euros is not null
              and (:vehicleId is null or ps.vehicle_id = :vehicleId)
            order by ps.revenue_euros desc, ps.exit_time desc
            limit 1
            """,
            params(userId, vehicleId, fromInclusive, toExclusive),
            (rs, row) -> new CostliestSessionRow(
                rs.getString("park_name"),
                asOffset(rs.getTimestamp("ended_at")),
                rs.getString("vehicle"),
                rs.getBigDecimal("total_spent")
            )
        );
        return rows.isEmpty() ? null : rows.get(0);
    }

    public List<HistoryRow> history(UUID userId, UUID vehicleId, OffsetDateTime fromInclusive, OffsetDateTime toExclusive) {
        return jdbc.query(
            """
            select pl.name as park_name,
                   ps.entry_time,
                   ps.exit_time,
                   extract(epoch from (ps.exit_time - ps.entry_time)) / 60 as duration_minutes,
                   v.plate as vehicle,
                   ps.revenue_euros as total_spent
            from parking_sessions ps
            join parking_lots pl on pl.id = ps.parking_lot_id
            left join vehicles v on v.id = ps.vehicle_id
            where ps.user_id = :userId
              and ps.entry_time >= :fromInclusive
              and ps.entry_time < :toExclusive
              and ps.exit_time is not null
              and ps.revenue_euros is not null
              and (:vehicleId is null or ps.vehicle_id = :vehicleId)
            order by ps.entry_time desc
            """,
            params(userId, vehicleId, fromInclusive, toExclusive),
            (rs, row) -> new HistoryRow(
                rs.getString("park_name"),
                asOffset(rs.getTimestamp("entry_time")),
                Math.round(rs.getDouble("duration_minutes")),
                rs.getString("vehicle"),
                rs.getBigDecimal("total_spent"),
                "COMPLETED"
            )
        );
    }

    private MapSqlParameterSource params(UUID userId, UUID vehicleId, OffsetDateTime fromInclusive, OffsetDateTime toExclusive) {
        return new MapSqlParameterSource()
            .addValue("userId", userId)
            .addValue("vehicleId", vehicleId)
            .addValue("fromInclusive", fromInclusive)
            .addValue("toExclusive", toExclusive);
    }

    private OffsetDateTime asOffset(Timestamp ts) {
        return ts.toInstant().atOffset(ZoneOffset.UTC);
    }

    public record TotalsRow(BigDecimal totalSpent, BigDecimal chargingSpent, BigDecimal parkingSpent, long sessions) {}
    public record TimeseriesPointRow(LocalDate date, BigDecimal totalSpent) {}
    public record ParkBreakdownRow(UUID parkId, String parkName, BigDecimal totalSpent) {}
    public record VehicleBreakdownRow(UUID vehicleId, String licensePlate, BigDecimal totalSpent) {}
    public record CostliestSessionRow(String parkName, OffsetDateTime date, String vehicle, BigDecimal totalSpent) {}
    public record HistoryRow(String parkName, OffsetDateTime date, long durationMinutes, String vehicle, BigDecimal totalSpent, String status) {}
}
