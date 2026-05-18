package pt.ua.deti.apieasyspot.booking.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pt.ua.deti.apieasyspot.booking.model.Reservation;
import pt.ua.deti.apieasyspot.booking.model.ReservationStatus;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ReservationRepository extends JpaRepository<Reservation, UUID> {

    Optional<Reservation> findByIdempotencyKey(String idempotencyKey);
    Optional<Reservation> findByUserIdAndIdempotencyKey(UUID userId, String idempotencyKey);

    @EntityGraph(attributePaths = {"parkingLot", "parkingSpot", "vehicle"})
    List<Reservation> findByUserIdOrderByCreatedAtDesc(UUID userId);

    // Spot-level overlap: count active reservations for the same spot in the requested window
    @Query("""
        SELECT COUNT(r) FROM Reservation r
        WHERE r.parkingSpot.id = :spotId
          AND r.status NOT IN ('CANCELLED', 'EXPIRED', 'COMPLETED')
          AND r.arrivalTime < :departureTime
          AND r.departureTime > :arrivalTime
        """)
    long countSpotConflicts(
        @Param("spotId") UUID spotId,
        @Param("arrivalTime") OffsetDateTime arrivalTime,
        @Param("departureTime") OffsetDateTime departureTime
    );

    @Query("""
        SELECT COUNT(r) FROM Reservation r
        WHERE r.parkingLot.id = :parkId
          AND r.status NOT IN ('CANCELLED', 'EXPIRED', 'COMPLETED')
          AND r.departureTime > :now
        """)
    long countActiveReservationsForLot(
        @Param("parkId") UUID parkId,
        @Param("now") OffsetDateTime now
    );

    @Query("""
        SELECT COUNT(r) FROM Reservation r
        WHERE r.parkingSpot.id = :spotId
          AND r.id <> :reservationId
          AND r.status NOT IN ('CANCELLED', 'EXPIRED', 'COMPLETED')
          AND r.arrivalTime < :departureTime
          AND r.departureTime > :arrivalTime
        """)
    long countSpotConflictsExcludingReservation(
        @Param("spotId") UUID spotId,
        @Param("reservationId") UUID reservationId,
        @Param("arrivalTime") OffsetDateTime arrivalTime,
        @Param("departureTime") OffsetDateTime departureTime
    );

    // Lot-level: count active reservations in the window to check against lot capacity
    @Query("""
        SELECT COUNT(r) FROM Reservation r
        WHERE r.parkingLot.id = :parkId
          AND r.status NOT IN ('CANCELLED', 'EXPIRED', 'COMPLETED')
          AND r.arrivalTime < :departureTime
          AND r.departureTime > :arrivalTime
        """)
    long countLotReservations(
        @Param("parkId") UUID parkId,
        @Param("arrivalTime") OffsetDateTime arrivalTime,
        @Param("departureTime") OffsetDateTime departureTime
    );

    @Query("""
        SELECT COUNT(r) FROM Reservation r
        WHERE r.parkingLot.id = :parkId
          AND r.id <> :reservationId
          AND r.status NOT IN ('CANCELLED', 'EXPIRED', 'COMPLETED')
          AND r.arrivalTime < :departureTime
          AND r.departureTime > :arrivalTime
        """)
    long countLotReservationsExcludingReservation(
        @Param("parkId") UUID parkId,
        @Param("reservationId") UUID reservationId,
        @Param("arrivalTime") OffsetDateTime arrivalTime,
        @Param("departureTime") OffsetDateTime departureTime
    );

    // Vehicle conflict: same vehicle already reserved at this lot in the same window
    @Query("""
        SELECT COUNT(r) FROM Reservation r
        WHERE r.vehicle.id = :vehicleId
          AND r.parkingLot.id = :parkId
          AND r.status NOT IN ('CANCELLED', 'EXPIRED', 'COMPLETED')
          AND r.arrivalTime < :departureTime
          AND r.departureTime > :arrivalTime
        """)
    long countVehicleConflicts(
        @Param("vehicleId") UUID vehicleId,
        @Param("parkId") UUID parkId,
        @Param("arrivalTime") OffsetDateTime arrivalTime,
        @Param("departureTime") OffsetDateTime departureTime
    );

    @Query("""
        SELECT COUNT(r) FROM Reservation r
        WHERE r.vehicle.id = :vehicleId
          AND r.parkingLot.id = :parkId
          AND r.id <> :reservationId
          AND r.status NOT IN ('CANCELLED', 'EXPIRED', 'COMPLETED')
          AND r.arrivalTime < :departureTime
          AND r.departureTime > :arrivalTime
        """)
    long countVehicleConflictsExcludingReservation(
        @Param("vehicleId") UUID vehicleId,
        @Param("parkId") UUID parkId,
        @Param("reservationId") UUID reservationId,
        @Param("arrivalTime") OffsetDateTime arrivalTime,
        @Param("departureTime") OffsetDateTime departureTime
    );

    // Lazy expiry: CONFIRMED reservations where the no-show grace window has passed
    @Modifying
    @Query("""
        UPDATE Reservation r SET r.status = :expiredStatus, r.lockedUntil = null
        WHERE r.status = :confirmedStatus
          AND r.lockedUntil < :now
        """)
    int expireTimedOutLocks(
        @Param("now") OffsetDateTime now,
        @Param("confirmedStatus") ReservationStatus confirmedStatus,
        @Param("expiredStatus") ReservationStatus expiredStatus
    );

    @Query("""
        SELECT r FROM Reservation r
        LEFT JOIN FETCH r.parkingSpot
        LEFT JOIN FETCH r.parkingLot
        WHERE r.status NOT IN ('CANCELLED', 'EXPIRED', 'COMPLETED')
          AND r.parkingSpot IS NOT NULL
        ORDER BY r.arrivalTime ASC
        """)
    List<Reservation> findAllActiveWithSpot();

    @Query("""
        SELECT r FROM Reservation r
        LEFT JOIN FETCH r.parkingSpot
        LEFT JOIN FETCH r.parkingLot
        WHERE r.parkingLot.id = :parkId
          AND r.status NOT IN ('CANCELLED', 'EXPIRED', 'COMPLETED')
          AND r.parkingSpot IS NOT NULL
        ORDER BY r.arrivalTime ASC
        """)
    List<Reservation> findActiveWithSpotByParkId(@Param("parkId") UUID parkId);

    @Query("""
        SELECT r FROM Reservation r
        LEFT JOIN FETCH r.parkingSpot
        LEFT JOIN FETCH r.parkingLot
        WHERE r.parkingLot.id IN :parkIds
          AND r.status NOT IN ('CANCELLED', 'EXPIRED', 'COMPLETED')
          AND r.parkingSpot IS NOT NULL
        ORDER BY r.arrivalTime ASC
        """)
    List<Reservation> findActiveWithSpotByParkIds(@Param("parkIds") List<UUID> parkIds);

    @Query("""
        SELECT r FROM Reservation r
        WHERE r.user.id = :userId
          AND r.status IN :activeStatuses
        ORDER BY r.arrivalTime ASC
        """)
    List<Reservation> findActiveByUserId(
        @Param("userId") UUID userId,
        @Param("activeStatuses") List<ReservationStatus> activeStatuses
    );

    boolean existsByBookingCode(String bookingCode);

    Optional<Reservation> findByIdAndUserId(UUID id, UUID userId);

    @Query("SELECT COUNT(s) > 0 FROM ParkingSpot s WHERE s.id = :spotId AND s.parkingLot.id = :parkId")
    boolean spotBelongsToPark(@Param("spotId") UUID spotId, @Param("parkId") UUID parkId);

    @Query("""
        SELECT DISTINCT r.parkingSpot.id FROM Reservation r
        WHERE r.parkingSpot.id IN :spotIds
          AND r.status NOT IN ('CANCELLED', 'EXPIRED', 'COMPLETED')
          AND r.arrivalTime < :departureTime
          AND r.departureTime > :arrivalTime
        """)
    List<UUID> findReservedSpotIds(
        @Param("spotIds") List<UUID> spotIds,
        @Param("arrivalTime") OffsetDateTime arrivalTime,
        @Param("departureTime") OffsetDateTime departureTime
    );

    @Query("""
        SELECT r FROM Reservation r
        LEFT JOIN FETCH r.parkingLot
        LEFT JOIN FETCH r.parkingSpot
        LEFT JOIN FETCH r.vehicle
        LEFT JOIN FETCH r.user
        WHERE r.id = :id AND r.user.id = :userId
        """)
    Optional<Reservation> findByIdAndUserIdWithDetails(
        @Param("id") UUID id,
        @Param("userId") UUID userId
    );

    @Query("""
        SELECT r FROM Reservation r
        LEFT JOIN FETCH r.user
        LEFT JOIN FETCH r.vehicle
        LEFT JOIN FETCH r.parkingLot
        LEFT JOIN FETCH r.parkingSpot
        WHERE r.parkingLot.id = :parkId
          AND UPPER(r.vehicle.plate) = UPPER(:plate)
          AND r.status IN :statuses
        ORDER BY r.departureTime ASC
        """)
    List<Reservation> findByParkIdAndVehiclePlateAndStatusInOrderByDepartureTimeAsc(
        @Param("parkId") UUID parkId,
        @Param("plate") String plate,
        @Param("statuses") List<ReservationStatus> statuses
    );
}
