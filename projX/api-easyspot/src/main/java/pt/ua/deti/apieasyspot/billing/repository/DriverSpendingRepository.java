package pt.ua.deti.apieasyspot.billing.repository;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Repository
public class DriverSpendingRepository {

    private static final String TOTAL_SPENT = "total_spent";
    private static final String PARKING_LOT_ID = "parking_lot_id";
    private static final String VEHICLE_ID = "vehicle_id";
    private static final String STATUS_COMPLETED = "COMPLETED";

    private final NamedParameterJdbcTemplate jdbc;
    private final NamedParameterJdbcTemplate pgJdbc;

    public DriverSpendingRepository(
            @Qualifier("timescaleNamedJdbcTemplate") NamedParameterJdbcTemplate jdbc,
            @Qualifier("namedParameterJdbcTemplate") NamedParameterJdbcTemplate pgJdbc) {
        this.jdbc = jdbc;
        this.pgJdbc = pgJdbc;
    }

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
              and (cast(:vehicleId as uuid) is null or ps.vehicle_id = cast(:vehicleId as uuid))
            """,
            params(userId, vehicleId, fromInclusive, toExclusive),
            (rs, row) -> new TotalsRow(
                rs.getBigDecimal(TOTAL_SPENT),
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
              and (cast(:vehicleId as uuid) is null or ps.vehicle_id = cast(:vehicleId as uuid))
            group by date(ps.entry_time)
            order by day
            """,
            params(userId, vehicleId, fromInclusive, toExclusive),
            (rs, row) -> new TimeseriesPointRow(
                rs.getDate("day").toLocalDate(),
                rs.getBigDecimal(TOTAL_SPENT)
            )
        );
    }

    public List<ParkBreakdownRow> breakdownByPark(UUID userId, UUID vehicleId, OffsetDateTime fromInclusive, OffsetDateTime toExclusive) {
        record RawPark(UUID parkId, BigDecimal totalSpent, long sessionCount) {}

        List<RawPark> raw = jdbc.query(
            """
            select ps.parking_lot_id,
                   coalesce(sum(ps.revenue_euros), 0) as total_spent,
                   count(*) as session_count
            from parking_sessions ps
            where ps.user_id = :userId
              and ps.entry_time >= :fromInclusive
              and ps.entry_time < :toExclusive
              and ps.exit_time is not null
              and ps.revenue_euros is not null
              and (cast(:vehicleId as uuid) is null or ps.vehicle_id = cast(:vehicleId as uuid))
            group by ps.parking_lot_id
            order by total_spent desc
            """,
            params(userId, vehicleId, fromInclusive, toExclusive),
            (rs, row) -> new RawPark(
                UUID.fromString(rs.getString(PARKING_LOT_ID)),
                rs.getBigDecimal(TOTAL_SPENT),
                rs.getLong("session_count")
            )
        );

        if (raw.isEmpty()) return List.of();

        List<String> ids = raw.stream().map(r -> r.parkId().toString()).toList();
        Map<UUID, String> names = parkNames(ids);

        return raw.stream()
            .map(r -> new ParkBreakdownRow(
                r.parkId(),
                names.getOrDefault(r.parkId(), r.parkId().toString()),
                r.totalSpent(),
                r.sessionCount()
            ))
            .sorted((a, b) -> {
                int c = b.totalSpent().compareTo(a.totalSpent());
                return c != 0 ? c : a.parkName().compareTo(b.parkName());
            })
            .toList();
    }

    public List<VehicleBreakdownRow> breakdownByVehicle(UUID userId, UUID vehicleId, OffsetDateTime fromInclusive, OffsetDateTime toExclusive) {
        record RawVehicle(UUID vehicleId, BigDecimal totalSpent) {}

        List<RawVehicle> raw = jdbc.query(
            """
            select ps.vehicle_id, coalesce(sum(ps.revenue_euros), 0) as total_spent
            from parking_sessions ps
            where ps.user_id = :userId
              and ps.entry_time >= :fromInclusive
              and ps.entry_time < :toExclusive
              and ps.exit_time is not null
              and ps.revenue_euros is not null
              and ps.vehicle_id is not null
              and (cast(:vehicleId as uuid) is null or ps.vehicle_id = cast(:vehicleId as uuid))
            group by ps.vehicle_id
            order by total_spent desc
            """,
            params(userId, vehicleId, fromInclusive, toExclusive),
            (rs, row) -> new RawVehicle(
                UUID.fromString(rs.getString(VEHICLE_ID)),
                rs.getBigDecimal(TOTAL_SPENT)
            )
        );

        if (raw.isEmpty()) return List.of();

        List<String> ids = raw.stream().map(r -> r.vehicleId().toString()).toList();
        Map<UUID, String> plates = vehiclePlates(ids);

        return raw.stream()
            .map(r -> new VehicleBreakdownRow(
                r.vehicleId(),
                plates.getOrDefault(r.vehicleId(), r.vehicleId().toString()),
                r.totalSpent()
            ))
            .sorted((a, b) -> {
                int c = b.totalSpent().compareTo(a.totalSpent());
                return c != 0 ? c : a.licensePlate().compareTo(b.licensePlate());
            })
            .toList();
    }

    public CostliestSessionRow costliestSession(UUID userId, UUID vehicleId, OffsetDateTime fromInclusive, OffsetDateTime toExclusive) {
        record RawSession(UUID parkId, UUID vid, OffsetDateTime endedAt, BigDecimal totalSpent) {}

        List<RawSession> rows = jdbc.query(
            """
            select ps.parking_lot_id,
                   ps.vehicle_id,
                   ps.exit_time as ended_at,
                   ps.revenue_euros as total_spent
            from parking_sessions ps
            where ps.user_id = :userId
              and ps.entry_time >= :fromInclusive
              and ps.entry_time < :toExclusive
              and ps.exit_time is not null
              and ps.revenue_euros is not null
              and (cast(:vehicleId as uuid) is null or ps.vehicle_id = cast(:vehicleId as uuid))
            order by ps.revenue_euros desc, ps.exit_time desc
            limit 1
            """,
            params(userId, vehicleId, fromInclusive, toExclusive),
            (rs, row) -> new RawSession(
                UUID.fromString(rs.getString(PARKING_LOT_ID)),
                rs.getString("vehicle_id") != null ? UUID.fromString(rs.getString("vehicle_id")) : null,
                asOffset(rs.getTimestamp("ended_at")),
                rs.getBigDecimal(TOTAL_SPENT)
            )
        );

        if (rows.isEmpty()) return null;
        RawSession r = rows.get(0);

        Map<UUID, String> names = parkNames(List.of(r.parkId().toString()));
        String plate = r.vid() != null
            ? vehiclePlates(List.of(r.vid().toString())).getOrDefault(r.vid(), null)
            : null;

        return new CostliestSessionRow(
            names.getOrDefault(r.parkId(), r.parkId().toString()),
            r.endedAt(),
            plate,
            r.totalSpent()
        );
    }

    public long countHistory(UUID userId, UUID vehicleId, OffsetDateTime fromInclusive, OffsetDateTime toExclusive) {
        Long result = jdbc.queryForObject(
            """
            select count(*)
            from parking_sessions ps
            where ps.user_id = :userId
              and ps.entry_time >= :fromInclusive
              and ps.entry_time < :toExclusive
              and ps.exit_time is not null
              and ps.revenue_euros is not null
              and (cast(:vehicleId as uuid) is null or ps.vehicle_id = cast(:vehicleId as uuid))
            """,
            params(userId, vehicleId, fromInclusive, toExclusive),
            Long.class
        );
        return result != null ? result : 0L;
    }

    public List<HistoryRow> history(UUID userId, UUID vehicleId, OffsetDateTime fromInclusive, OffsetDateTime toExclusive, int page, int size) {
        record RawHistory(UUID parkId, UUID vid, OffsetDateTime entryTime, long durationMinutes, BigDecimal totalSpent) {}

        var p = params(userId, vehicleId, fromInclusive, toExclusive)
            .addValue("limit", size)
            .addValue("offset", (long) page * size);

        List<RawHistory> raw = jdbc.query(
            """
            select ps.parking_lot_id,
                   ps.vehicle_id,
                   ps.entry_time,
                   extract(epoch from (ps.exit_time - ps.entry_time)) / 60 as duration_minutes,
                   ps.revenue_euros as total_spent
            from parking_sessions ps
            where ps.user_id = :userId
              and ps.entry_time >= :fromInclusive
              and ps.entry_time < :toExclusive
              and ps.exit_time is not null
              and ps.revenue_euros is not null
              and (cast(:vehicleId as uuid) is null or ps.vehicle_id = cast(:vehicleId as uuid))
            order by ps.entry_time desc
            limit :limit offset :offset
            """,
            p,
            (rs, row) -> {
                String vidStr = rs.getString("vehicle_id");
                return new RawHistory(
                    UUID.fromString(rs.getString(PARKING_LOT_ID)),
                    vidStr != null ? UUID.fromString(vidStr) : null,
                    asOffset(rs.getTimestamp("entry_time")),
                    Math.round(rs.getDouble("duration_minutes")),
                    rs.getBigDecimal(TOTAL_SPENT)
                );
            }
        );

        if (raw.isEmpty()) return List.of();

        List<String> parkIds = raw.stream().map(r -> r.parkId().toString()).distinct().toList();
        List<String> vehicleIds = raw.stream()
            .filter(r -> r.vid() != null)
            .map(r -> r.vid().toString())
            .distinct().toList();

        Map<UUID, String> names = parkNames(parkIds);
        Map<UUID, String> plates = vehicleIds.isEmpty() ? Map.of() : vehiclePlates(vehicleIds);

        return raw.stream()
            .map(r -> new HistoryRow(
                names.getOrDefault(r.parkId(), r.parkId().toString()),
                r.entryTime(),
                r.durationMinutes(),
                r.vid() != null ? plates.getOrDefault(r.vid(), null) : null,
                r.totalSpent(),
                STATUS_COMPLETED
            ))
            .toList();
    }

    private Map<UUID, String> parkNames(List<String> ids) {
        if (ids.isEmpty()) return Map.of();
        return pgJdbc.query(
            "select id, name from parking_lots where id::text = any(:ids)",
            new MapSqlParameterSource("ids", ids.toArray(new String[0])),
            (rs, row) -> Map.entry(UUID.fromString(rs.getString("id")), rs.getString("name"))
        ).stream().collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    private Map<UUID, String> vehiclePlates(List<String> ids) {
        if (ids.isEmpty()) return Map.of();
        return pgJdbc.query(
            "select id, plate from vehicles where id::text = any(:ids)",
            new MapSqlParameterSource("ids", ids.toArray(new String[0])),
            (rs, row) -> Map.entry(UUID.fromString(rs.getString("id")), rs.getString("plate"))
        ).stream().collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    private MapSqlParameterSource params(UUID userId, UUID vehicleId, OffsetDateTime fromInclusive, OffsetDateTime toExclusive) {
        return new MapSqlParameterSource()
            .addValue("userId", userId)
            .addValue("vehicleId", vehicleId, Types.OTHER)
            .addValue("fromInclusive", fromInclusive)
            .addValue("toExclusive", toExclusive);
    }

    private OffsetDateTime asOffset(Timestamp ts) {
        return ts.toInstant().atOffset(ZoneOffset.UTC);
    }

    public record TotalsRow(BigDecimal totalSpent, BigDecimal chargingSpent, BigDecimal parkingSpent, long sessions) {}
    public record TimeseriesPointRow(LocalDate date, BigDecimal totalSpent) {}
    public record ParkBreakdownRow(UUID parkId, String parkName, BigDecimal totalSpent, long sessionCount) {}
    public record VehicleBreakdownRow(UUID vehicleId, String licensePlate, BigDecimal totalSpent) {}
    public record CostliestSessionRow(String parkName, OffsetDateTime date, String vehicle, BigDecimal totalSpent) {}
    public record HistoryRow(String parkName, OffsetDateTime date, long durationMinutes, String vehicle, BigDecimal totalSpent, String status) {}
}
