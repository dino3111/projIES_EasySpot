package pt.ua.deti.apieasyspot.occupancy.repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pt.ua.deti.apieasyspot.occupancy.model.ZoneType;

@Repository
public class TimescaleOccupancySnapshotRepository {

    private final JdbcTemplate jdbc;

    public TimescaleOccupancySnapshotRepository(@Qualifier("timescaleJdbcTemplate") JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public int sumFreeSpacesFromLatestSnapshot(UUID lotId) {
        Integer result = jdbc.queryForObject(
            """
            SELECT COALESCE(SUM(s.total_count - s.occupied_count), -1)
            FROM (
                SELECT DISTINCT ON (zone_type) total_count, occupied_count
                FROM occupancy_snapshots
                WHERE parking_lot_id = ?
                ORDER BY zone_type, recorded_at DESC
            ) s
            """,
            Integer.class,
            lotId
        );
        return result != null ? result : -1;
    }

    public List<ZoneSnapshot> latestByLot(UUID lotId) {
        return jdbc.query(
            """
            select zone_type, occupied_count, total_count, recorded_at
            from (
                select zone_type, occupied_count, total_count, recorded_at,
                       row_number() over (partition by zone_type order by recorded_at desc) as rn
                from occupancy_snapshots
                where parking_lot_id = ?
            ) latest
            where rn = 1
            """,
            (rs, rowNum) -> new ZoneSnapshot(
                ZoneType.valueOf(rs.getString("zone_type")),
                rs.getInt("occupied_count"),
                rs.getInt("total_count"),
                rs.getTimestamp("recorded_at").toInstant()
            ),
            lotId
        );
    }

    public Map<UUID, List<ZoneSnapshot>> latestByLotIds(Collection<UUID> lotIds) {
        if (lotIds == null || lotIds.isEmpty()) return Map.of();
        String placeholders = lotIds.stream().map(_id -> "?").collect(Collectors.joining(","));
        Object[] params = lotIds.toArray();
        List<LotZoneSnapshot> rows = jdbc.query(
            """
            select parking_lot_id, zone_type, occupied_count, total_count, recorded_at
            from (
                select parking_lot_id, zone_type, occupied_count, total_count, recorded_at,
                       row_number() over (partition by parking_lot_id, zone_type order by recorded_at desc) as rn
                from occupancy_snapshots
                where parking_lot_id in (%s)
            ) latest
            where rn = 1
            """.formatted(placeholders),
            (rs, rowNum) -> new LotZoneSnapshot(
                UUID.fromString(rs.getString("parking_lot_id")),
                new ZoneSnapshot(
                    ZoneType.valueOf(rs.getString("zone_type")),
                    rs.getInt("occupied_count"),
                    rs.getInt("total_count"),
                    rs.getTimestamp("recorded_at").toInstant()
                )
            ),
            params
        );
        return rows.stream().collect(Collectors.groupingBy(LotZoneSnapshot::lotId,
            Collectors.mapping(LotZoneSnapshot::snapshot, Collectors.toList())));
    }

    public void insert(UUID id, UUID parkingLotId, ZoneType zoneType, int occupiedCount, int totalCount, Instant recordedAt) {
        jdbc.update(
            """
            insert into occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at)
            values (?, ?, ?, ?, ?, ?)
            """,
            id, parkingLotId, zoneType.name(), occupiedCount, totalCount, Timestamp.from(recordedAt)
        );
    }

    public Map<UUID, List<HourlyOccupancyPoint>> hourlyOccupancyLast7Days(Collection<UUID> lotIds) {
        if (lotIds == null || lotIds.isEmpty()) return Map.of();
        String placeholders = lotIds.stream().map(id -> "?").collect(Collectors.joining(","));
        Object[] params = lotIds.toArray();
        List<LotHourlyPoint> rows = jdbc.query(
            """
            SELECT parking_lot_id,
                   EXTRACT(HOUR FROM recorded_at AT TIME ZONE 'Europe/Lisbon') AS hour_of_day,
                   ROUND(AVG(CASE WHEN total_count > 0
                       THEN occupied_count::numeric / total_count * 100 ELSE 0 END)) AS occ_pct
            FROM occupancy_snapshots
            WHERE parking_lot_id IN (%s)
              AND recorded_at >= NOW() - INTERVAL '7 days'
            GROUP BY parking_lot_id, hour_of_day
            ORDER BY parking_lot_id, hour_of_day
            """.formatted(placeholders),
            (rs, rowNum) -> new LotHourlyPoint(
                UUID.fromString(rs.getString("parking_lot_id")),
                new HourlyOccupancyPoint(rs.getInt("hour_of_day"), rs.getInt("occ_pct"))
            ),
            params
        );
        return rows.stream().collect(Collectors.groupingBy(LotHourlyPoint::lotId,
            Collectors.mapping(LotHourlyPoint::point, Collectors.toList())));
    }

    public record ZoneSnapshot(ZoneType zoneType, int occupiedCount, int totalCount, Instant recordedAt) {}
    public record HourlyOccupancyPoint(int hourOfDay, int occupancyPercent) {}
    private record LotZoneSnapshot(UUID lotId, ZoneSnapshot snapshot) {}
    private record LotHourlyPoint(UUID lotId, HourlyOccupancyPoint point) {}
}
