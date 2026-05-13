package pt.ua.deti.apieasyspot.occupancy.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingSpot;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ParkingSpotRepository extends JpaRepository<ParkingSpot, UUID> {

    List<ParkingSpot> findByParkingLotId(UUID parkingLotId);

    void deleteByParkingLotId(UUID parkingLotId);

    List<ParkingSpot> findByParkingLotIdIn(Collection<UUID> parkingLotIds);

    // Acquires a row-level write lock to prevent concurrent reservation of the same spot
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM ParkingSpot s WHERE s.id = :id")
    Optional<ParkingSpot> findByIdWithLock(@Param("id") UUID id);

    List<ParkingSpot> findByParkingLotIdAndStatus(UUID parkingLotId, String status);

    @Modifying
    @Query(value = """
        UPDATE parking_spots SET status = 'free'
        WHERE status = 'reserved'
          AND NOT EXISTS (
              SELECT 1 FROM reservations r
              WHERE r.parking_spot_id = parking_spots.id
                AND r.status NOT IN ('CANCELLED', 'EXPIRED', 'COMPLETED')
          )
        """, nativeQuery = true)
    int releaseExpiredReservedSpots();

    @Query(value = """
        SELECT * FROM parking_spots s
        WHERE s.parking_lot_id = :parkingLotId
          AND s.status = :status
          AND NOT EXISTS (
              SELECT 1 FROM reservations r
              WHERE r.parking_spot_id = s.id
                AND r.status NOT IN ('CANCELLED', 'EXPIRED', 'COMPLETED')
                AND r.arrival_time < :departureTime
                AND r.departure_time > :arrivalTime
          )
        ORDER BY s.spot_row ASC, s.spot_col ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
        """, nativeQuery = true)
    Optional<ParkingSpot> findFirstFreeByParkingLotIdForUpdateSkipLocked(
        @Param("parkingLotId") UUID parkingLotId,
        @Param("status") String status,
        @Param("arrivalTime") OffsetDateTime arrivalTime,
        @Param("departureTime") OffsetDateTime departureTime
    );
}
