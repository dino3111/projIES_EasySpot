package pt.ua.deti.apieasyspot.billing.repository;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import pt.ua.deti.apieasyspot.billing.dto.ManagerBillingSessionResponse;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Repository
public class ManagerBillingRepository {

    private final NamedParameterJdbcTemplate timescaleJdbc;
    private final NamedParameterJdbcTemplate pgJdbc;

    public ManagerBillingRepository(
            @Qualifier("timescaleNamedJdbcTemplate") NamedParameterJdbcTemplate timescaleJdbc,
            @Qualifier("namedParameterJdbcTemplate") NamedParameterJdbcTemplate pgJdbc) {
        this.timescaleJdbc = timescaleJdbc;
        this.pgJdbc = pgJdbc;
    }

    public long countRecent(UUID parkId, OffsetDateTime since) {
        String sql = """
            select count(*)
            from parking_sessions ps
            where ps.exit_time is not null
              and ps.revenue_euros is not null
              and ps.entry_time >= :since
              and (cast(:parkId as uuid) is null or ps.parking_lot_id = cast(:parkId as uuid))
            """;
        Long result = timescaleJdbc.queryForObject(sql, params(parkId, since), Long.class);
        return result != null ? result : 0L;
    }

    public List<ManagerBillingSessionResponse> findRecent(UUID parkId, OffsetDateTime since, int page, int size) {
        record Raw(UUID id, UUID lotId, UUID vehicleId, OffsetDateTime entry, OffsetDateTime exit,
                   String zone, BigDecimal revenue) {}

        String sql = """
            select ps.id, ps.parking_lot_id, ps.vehicle_id,
                   ps.entry_time, ps.exit_time, ps.zone_type, ps.revenue_euros
            from parking_sessions ps
            where ps.exit_time is not null
              and ps.revenue_euros is not null
              and ps.entry_time >= :since
              and (cast(:parkId as uuid) is null or ps.parking_lot_id = cast(:parkId as uuid))
            order by ps.entry_time desc
            limit :limit offset :offset
            """;

        var p = params(parkId, since)
            .addValue("limit", size)
            .addValue("offset", (long) page * size);

        List<Raw> rows = timescaleJdbc.query(sql, p, (rs, i) -> new Raw(
            UUID.fromString(rs.getString("id")),
            UUID.fromString(rs.getString("parking_lot_id")),
            rs.getString("vehicle_id") != null ? UUID.fromString(rs.getString("vehicle_id")) : null,
            rs.getTimestamp("entry_time").toInstant().atOffset(ZoneOffset.UTC),
            rs.getTimestamp("exit_time").toInstant().atOffset(ZoneOffset.UTC),
            rs.getString("zone_type"),
            rs.getBigDecimal("revenue_euros")
        ));

        if (rows.isEmpty()) return List.of();

        List<String> lotIds = rows.stream().map(r -> r.lotId().toString()).distinct().toList();
        List<String> vIds   = rows.stream().filter(r -> r.vehicleId() != null)
                                           .map(r -> r.vehicleId().toString()).distinct().toList();

        Map<UUID, String> names  = parkNames(lotIds);
        Map<UUID, String> plates = vIds.isEmpty() ? Map.of() : vehiclePlates(vIds);

        return rows.stream().map(r -> {
            long durationMin = (r.exit().toEpochSecond() - r.entry().toEpochSecond()) / 60;
            boolean isEv = "EV".equalsIgnoreCase(r.zone());
            BigDecimal evRev     = isEv ? r.revenue() : BigDecimal.ZERO;
            BigDecimal parkRev   = isEv ? BigDecimal.ZERO : r.revenue();
            return new ManagerBillingSessionResponse(
                r.id(),
                names.getOrDefault(r.lotId(), r.lotId().toString()),
                r.entry(),
                r.exit(),
                durationMin,
                r.vehicleId() != null ? plates.getOrDefault(r.vehicleId(), null) : null,
                r.zone(),
                parkRev,
                evRev,
                r.revenue()
            );
        }).toList();
    }

    private Map<UUID, String> parkNames(List<String> ids) {
        if (ids.isEmpty()) return Map.of();
        return pgJdbc.query(
            "select id, name from parking_lots where id::text = any(:ids)",
            new MapSqlParameterSource("ids", ids.toArray(new String[0])),
            (rs, i) -> Map.entry(UUID.fromString(rs.getString("id")), rs.getString("name"))
        ).stream().collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    private Map<UUID, String> vehiclePlates(List<String> ids) {
        if (ids.isEmpty()) return Map.of();
        return pgJdbc.query(
            "select id, plate from vehicles where id::text = any(:ids)",
            new MapSqlParameterSource("ids", ids.toArray(new String[0])),
            (rs, i) -> Map.entry(UUID.fromString(rs.getString("id")), rs.getString("plate"))
        ).stream().collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    private MapSqlParameterSource params(UUID parkId, OffsetDateTime since) {
        return new MapSqlParameterSource()
            .addValue("parkId", parkId != null ? parkId.toString() : null)
            .addValue("since", since);
    }
}
