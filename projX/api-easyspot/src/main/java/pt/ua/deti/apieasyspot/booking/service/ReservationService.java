package pt.ua.deti.apieasyspot.booking.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.billing.service.BillingService;
import pt.ua.deti.apieasyspot.booking.dto.CreateReservationRequest;
import pt.ua.deti.apieasyspot.booking.dto.ReservationResponse;
import pt.ua.deti.apieasyspot.booking.event.ReservationEventPublisher;
import pt.ua.deti.apieasyspot.booking.model.Reservation;
import pt.ua.deti.apieasyspot.booking.model.ReservationStatus;
import pt.ua.deti.apieasyspot.booking.repository.ReservationRepository;
import pt.ua.deti.apieasyspot.common.exception.ConflictException;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;
import pt.ua.deti.apieasyspot.common.exception.UnprocessableEntityException;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingSpot;
import pt.ua.deti.apieasyspot.occupancy.model.Tariff;
import pt.ua.deti.apieasyspot.occupancy.repository.OccupancySnapshotRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingSpotRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.TariffRepository;
import pt.ua.deti.apieasyspot.vehicle.model.Vehicle;
import pt.ua.deti.apieasyspot.vehicle.repository.VehicleRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReservationService {

    private static final int LOCK_MINUTES = 30;
    private static final String BOOKING_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final ReservationRepository reservationRepository;
    private final UserRepository userRepository;
    private final ParkingLotRepository parkingLotRepository;
    private final ParkingSpotRepository parkingSpotRepository;
    private final VehicleRepository vehicleRepository;
    private final TariffRepository tariffRepository;
    private final OccupancySnapshotRepository occupancySnapshotRepository;
    private final BillingService billingService;
    private final BookingConfirmationMailService confirmationMailService;
    private final ReservationEventPublisher eventPublisher;

    @Transactional
    public ReservationResponse create(String authentikUserId, String idempotencyKey,
                                      CreateReservationRequest request) {
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            return reservationRepository.findByIdempotencyKey(idempotencyKey)
                .map(this::toResponse)
                .orElseGet(() -> doCreate(authentikUserId, idempotencyKey, request));
        }
        return doCreate(authentikUserId, null, request);
    }

    private ReservationResponse doCreate(String authentikUserId, String idempotencyKey,
                                         CreateReservationRequest request) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        // 1. Parse and validate times — fail fast before any DB lookups
        OffsetDateTime arrival   = parseDateTime(request.arrivalDateTime(), "arrivalDateTime");
        OffsetDateTime departure = parseDateTime(request.departureDateTime(), "departureDateTime");
        validateTimeWindow(arrival, departure, now);

        // 2. Lazy expiry of timed-out locks before conflict detection
        reservationRepository.expireTimedOutLocks(now);

        // 3. Resolve entities
        User user       = findUser(authentikUserId);
        ParkingLot lot  = findLot(request.parkId());
        Vehicle vehicle = findVehicleOwnedByUser(request.vehicleId(), user.getId());

        validateOpeningHours(lot, arrival, departure);

        // 4. Real-time occupancy check (TimescaleDB / OccupancyModule)
        //    -1 means no snapshot data yet — fall back to reservation-count check only
        int liveFreeSpotsFromSensor = occupancySnapshotRepository.sumFreeSpacesFromLatestSnapshot(lot.getId());
        long activeReservations     = reservationRepository.countLotReservations(lot.getId(), arrival, departure);

        if (liveFreeSpotsFromSensor >= 0) {
            // Sensor data available: subtract already-active reservations from sensor-reported free spaces
            long effectiveFree = liveFreeSpotsFromSensor - activeReservations;
            if (effectiveFree <= 0) {
                throw new ConflictException("Parking lot is fully booked for the requested time window");
            }
        } else {
            // No sensor data: rely on configured capacity
            if (activeReservations >= lot.getTotalSpaces()) {
                throw new ConflictException("Parking lot is fully booked for the requested time window");
            }
        }

        // 5. Vehicle conflict: prevent same vehicle double-booking at same lot
        long vehicleConflicts = reservationRepository.countVehicleConflicts(
            vehicle.getId(), lot.getId(), arrival, departure);
        if (vehicleConflicts > 0) {
            throw new ConflictException(
                "This vehicle already has an active reservation at this parking lot for the requested period");
        }

        // 6. Spot resolution with pessimistic row-lock
        ParkingSpot spot = resolveSpot(request, lot, arrival, departure);

        // 7. Cost calculation
        BigDecimal estimatedCost = calculateCost(lot, arrival, departure);

        // 8. Persist reservation
        Reservation reservation = new Reservation();
        reservation.setUser(user);
        reservation.setParkingLot(lot);
        reservation.setParkingSpot(spot);
        reservation.setVehicle(vehicle);
        reservation.setArrivalTime(arrival);
        reservation.setDepartureTime(departure);
        reservation.setStatus(ReservationStatus.CONFIRMED);
        // lockedUntil = arrival + 30 min: spot released if driver doesn't show within grace window
        reservation.setLockedUntil(arrival.plusMinutes(LOCK_MINUTES));
        reservation.setEstimatedCost(estimatedCost);
        reservation.setBookingCode(generateUniqueBookingCode());
        reservation.setIdempotencyKey(idempotencyKey);

        if (spot != null) {
            spot.setStatus("reserved");
            parkingSpotRepository.save(spot);
        }

        Reservation saved = reservationRepository.save(reservation);

        // 9. BillingModule: create Stripe PaymentIntent + ParkingSession record
        //    Runs in a separate transaction; failure never rolls back the reservation
        try {
            billingService.createPaymentIntentForReservation(saved);
        } catch (Exception ex) {
            log.warn("Billing step failed for reservation {} (reservation still confirmed): {}",
                saved.getBookingCode(), ex.getMessage());
        }

        // 10. NotificationModule: send booking confirmation email (Gmail SMTP)
        try {
            confirmationMailService.sendConfirmation(saved);
        } catch (Exception ex) {
            log.warn("Confirmation email failed for reservation {}: {}", saved.getBookingCode(), ex.getMessage());
        }

        // 11. Publish Kafka event so other consumers (NotificationModule, AnalyticsModule) react
        try {
            eventPublisher.publishCreated(saved);
        } catch (Exception ex) {
            log.warn("Kafka event publish failed for reservation {}: {}", saved.getBookingCode(), ex.getMessage());
        }

        return toResponse(saved);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private ParkingSpot resolveSpot(CreateReservationRequest request, ParkingLot lot,
                                    OffsetDateTime arrival, OffsetDateTime departure) {
        if (request.selectedSpotId() != null) {
            if (!reservationRepository.spotBelongsToPark(request.selectedSpotId(), lot.getId())) {
                throw new UnprocessableEntityException(
                    "Spot " + request.selectedSpotId() + " does not belong to park " + lot.getId());
            }
            ParkingSpot spot = parkingSpotRepository.findByIdWithLock(request.selectedSpotId())
                .orElseThrow(() -> new ResourceNotFoundException("Spot not found: " + request.selectedSpotId()));

            if ("occupied".equals(spot.getStatus()) || "reserved".equals(spot.getStatus())) {
                throw new ConflictException("Spot " + spot.getSpotNumber() + " is not available");
            }
            long spotConflicts = reservationRepository.countSpotConflicts(spot.getId(), arrival, departure);
            if (spotConflicts > 0) {
                throw new ConflictException(
                    "Spot " + spot.getSpotNumber() + " already has a reservation for this time window");
            }
            return spot;
        }

        return parkingSpotRepository.findByParkingLotIdAndStatus(lot.getId(), "free").stream()
            .filter(s -> reservationRepository.countSpotConflicts(s.getId(), arrival, departure) == 0)
            .findFirst()
            .orElse(null);
    }

    private BigDecimal calculateCost(ParkingLot lot, OffsetDateTime arrival, OffsetDateTime departure) {
        List<Tariff> tariffs = tariffRepository.findByParkingLotId(lot.getId());
        if (tariffs.isEmpty()) return BigDecimal.ZERO;

        Tariff tariff = tariffs.stream()
            .filter(t -> t.getPricePerHour() != null)
            .min((a, b) -> a.getPricePerHour().compareTo(b.getPricePerHour()))
            .orElse(tariffs.get(0));

        if (tariff.getPricePerHour() == null) return BigDecimal.ZERO;

        long minutes = java.time.Duration.between(arrival, departure).toMinutes();
        BigDecimal hours = BigDecimal.valueOf(minutes).divide(BigDecimal.valueOf(60), 4, RoundingMode.HALF_UP);
        BigDecimal cost  = tariff.getPricePerHour().multiply(hours).setScale(2, RoundingMode.HALF_UP);

        if (tariff.getMaxDaily() != null && cost.compareTo(tariff.getMaxDaily()) > 0) {
            cost = tariff.getMaxDaily();
        }
        return cost;
    }

    private void validateTimeWindow(OffsetDateTime arrival, OffsetDateTime departure, OffsetDateTime now) {
        if (!arrival.isAfter(now)) {
            throw new UnprocessableEntityException("arrivalDateTime must be in the future");
        }
        if (!departure.isAfter(arrival)) {
            throw new UnprocessableEntityException("departureDateTime must be after arrivalDateTime");
        }
        if (arrival.isBefore(now.plusMinutes(30))) {
            throw new UnprocessableEntityException("Reservations must be made at least 30 minutes in advance");
        }
        if (departure.isAfter(now.plusDays(30))) {
            throw new UnprocessableEntityException("Reservation window cannot exceed 30 days");
        }
    }

    private void validateOpeningHours(ParkingLot lot, OffsetDateTime arrival, OffsetDateTime departure) {
        String hours = lot.getOpeningHours();
        if (hours == null || hours.isBlank()) return;

        String[] parts = hours.split("-");
        if (parts.length != 2) return;

        try {
            LocalTime open  = LocalTime.parse(parts[0].trim());
            LocalTime close = LocalTime.parse(parts[1].trim());
            LocalTime arrivalTime   = arrival.toLocalTime();
            LocalTime departureTime = departure.toLocalTime();

            if (arrivalTime.isBefore(open) || arrivalTime.isAfter(close) || departureTime.isAfter(close)) {
                throw new UnprocessableEntityException(
                    "Reservation is outside the parking lot's opening hours (" + hours + ")");
            }
        } catch (DateTimeParseException ignored) {
            // Unparseable format — skip validation
        }
    }

    private String generateUniqueBookingCode() {
        String code;
        int attempts = 0;
        do {
            code = genCode();
            if (++attempts > 10) throw new IllegalStateException("Could not generate unique booking code");
        } while (reservationRepository.existsByBookingCode(code));
        return code;
    }

    private String genCode() {
        StringBuilder sb = new StringBuilder("ES-");
        for (int i = 0; i < 8; i++) {
            if (i == 4) sb.append('-');
            sb.append(BOOKING_CHARS.charAt(RANDOM.nextInt(BOOKING_CHARS.length())));
        }
        return sb.toString();
    }

    private OffsetDateTime parseDateTime(String value, String field) {
        try {
            return OffsetDateTime.parse(value);
        } catch (DateTimeParseException ex) {
            try {
                return java.time.LocalDateTime.parse(value).atOffset(ZoneOffset.UTC);
            } catch (DateTimeParseException ex2) {
                throw new UnprocessableEntityException(field + " is not a valid ISO8601 datetime: " + value);
            }
        }
    }

    private User findUser(String authentikUserId) {
        return userRepository.findByAuthentikUserId(authentikUserId)
            .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found"));
    }

    private ParkingLot findLot(UUID parkId) {
        return parkingLotRepository.findById(parkId)
            .orElseThrow(() -> new ResourceNotFoundException("Parking lot not found: " + parkId));
    }

    private Vehicle findVehicleOwnedByUser(UUID vehicleId, UUID userId) {
        return vehicleRepository.findByIdAndUserId(vehicleId, userId)
            .orElseThrow(() -> new ResourceNotFoundException(
                "Vehicle not found or does not belong to this user: " + vehicleId));
    }

    private ReservationResponse toResponse(Reservation r) {
        return new ReservationResponse(
            r.getId(),
            r.getBookingCode(),
            r.getParkingLot().getId(),
            r.getParkingLot().getName(),
            r.getParkingLot().getAddress(),
            r.getParkingSpot() != null ? r.getParkingSpot().getId()         : null,
            r.getParkingSpot() != null ? r.getParkingSpot().getSpotNumber() : null,
            r.getVehicle()     != null ? r.getVehicle().getId()             : null,
            r.getArrivalTime(),
            r.getDepartureTime(),
            r.getStatus().name(),
            r.getLockedUntil(),
            r.getEstimatedCost()
        );
    }
}
