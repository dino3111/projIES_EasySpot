package pt.ua.deti.apieasyspot.occupancy.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingSpot;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ParkingSpotRepository extends JpaRepository<ParkingSpot, UUID> {

    List<ParkingSpot> findByParkingLotId(UUID parkingLotId);

    // Acquires a row-level write lock to prevent concurrent reservation of the same spot
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM ParkingSpot s WHERE s.id = :id")
    Optional<ParkingSpot> findByIdWithLock(@Param("id") UUID id);

    List<ParkingSpot> findByParkingLotIdAndStatus(UUID parkingLotId, String status);

    @Query(value = """
        SELECT * FROM parking_spots s
        WHERE s.parking_lot_id = :parkingLotId
          AND s.status = :status
        ORDER BY s.spot_row ASC, s.spot_col ASC
        FOR UPDATE SKIP LOCKED
        """, nativeQuery = true)
    List<ParkingSpot> findFreeByParkingLotIdForUpdateSkipLocked(
        @Param("parkingLotId") UUID parkingLotId,
        @Param("status") String status
    );
}
