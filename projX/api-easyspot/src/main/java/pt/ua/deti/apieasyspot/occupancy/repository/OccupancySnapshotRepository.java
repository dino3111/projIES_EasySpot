package pt.ua.deti.apieasyspot.occupancy.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pt.ua.deti.apieasyspot.occupancy.model.OccupancySnapshot;

import java.util.UUID;

public interface OccupancySnapshotRepository extends JpaRepository<OccupancySnapshot, UUID> {

    // Returns total free spaces across all zones from the latest snapshots per zone
    @Query(value = """
        SELECT COALESCE(SUM(s.total_count - s.occupied_count), -1)
        FROM (
            SELECT DISTINCT ON (zone_type) total_count, occupied_count
            FROM occupancy_snapshots
            WHERE parking_lot_id = :lotId
            ORDER BY zone_type, recorded_at DESC
        ) s
        """, nativeQuery = true)
    int sumFreeSpacesFromLatestSnapshot(@Param("lotId") UUID lotId);
}
