package pt.ua.deti.apieasyspot.booking.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.booking.dto.CreateReservationRequest;
import pt.ua.deti.apieasyspot.booking.dto.ReservationResponse;
import pt.ua.deti.apieasyspot.booking.dto.UpdateReservationRequest;
import pt.ua.deti.apieasyspot.billing.service.BillingService;
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
import pt.ua.deti.apieasyspot.occupancy.model.ZoneType;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingSpotRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.TariffRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.TimescaleOccupancySnapshotRepository;
import pt.ua.deti.apieasyspot.vehicle.model.Vehicle;
import pt.ua.deti.apieasyspot.vehicle.repository.VehicleRepository;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ReservationServiceTest {

    @Mock private ReservationRepository reservationRepository;
    @Mock private UserRepository userRepository;
    @Mock private ParkingLotRepository parkingLotRepository;
    @Mock private ParkingSpotRepository parkingSpotRepository;
    @Mock private VehicleRepository vehicleRepository;
    @Mock private TariffRepository tariffRepository;
    @Mock private TimescaleOccupancySnapshotRepository occupancySnapshotRepository;
    @Mock private BillingService billingService;
    @Mock private BookingConfirmationMailService confirmationMailService;
    @Mock private ReservationEventPublisher eventPublisher;
    @Mock private ReservationRealtimeNotifier realtimeNotifier;

    @InjectMocks private ReservationService reservationService;

    private User user;
    private ParkingLot lot;
    private Vehicle vehicle;
    private Tariff tariff;

    private static final String AUTH_ID = "auth-sub-123";
    private static final OffsetDateTime ARRIVAL = OffsetDateTime.now(ZoneOffset.UTC)
            .plusDays(1).withHour(10).withMinute(0).withSecond(0).withNano(0);
    private static final OffsetDateTime DEPARTURE = ARRIVAL.plusHours(2);

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(UUID.randomUUID());
        user.setAuthentikUserId(AUTH_ID);
        user.setEmail("driver@easyspot.test");

        lot = new ParkingLot();
        lot.setId(UUID.randomUUID());
        lot.setName("Parque Central");
        lot.setAddress("Rua de Aveiro 1");
        lot.setTotalSpaces(100);
        lot.setOpeningHours("07:00-23:00");

        vehicle = new Vehicle();
        vehicle.setId(UUID.randomUUID());

        tariff = new Tariff();
        tariff.setId(UUID.randomUUID());
        tariff.setParkingLot(lot);
        tariff.setName("Standard");
        tariff.setPricePerHour(new BigDecimal("1.50"));
        tariff.setMaxDaily(new BigDecimal("12.00"));
    }

    // ── Happy path ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("create - valid request without specific spot - confirms reservation")
    void create_validRequest_returnsConfirmedReservation() {
        CreateReservationRequest req = request(null);
        stubHappyPath(0, 0, 0, Collections.emptyList());
        stubSave();

        ReservationResponse resp = reservationService.create(AUTH_ID, null, req);

        assertThat(resp.status()).isEqualTo(ReservationStatus.CONFIRMED.name());
        assertThat(resp.parkId()).isEqualTo(lot.getId());
        assertThat(resp.estimatedCost()).isEqualByComparingTo("3.00"); // 2h * 1.50
        verify(reservationRepository).save(any(Reservation.class));
        verify(eventPublisher).publishCreated(any(Reservation.class));
    }

    @Test
    @DisplayName("create - with specific spot - locks spot row and confirms")
    void create_withSelectedSpot_locksSpotAndConfirms() {
        ParkingSpot spot = freeSpot();
        CreateReservationRequest req = request(spot.getId());
        stubHappyPath(0, 0, 0, List.of(spot));
        when(reservationRepository.spotBelongsToPark(spot.getId(), lot.getId())).thenReturn(true);
        when(parkingSpotRepository.findByIdWithLock(spot.getId())).thenReturn(Optional.of(spot));
        when(reservationRepository.countSpotConflicts(eq(spot.getId()), any(), any())).thenReturn(0L);
        stubSave();

        ReservationResponse resp = reservationService.create(AUTH_ID, null, req);

        assertThat(resp.spotId()).isEqualTo(spot.getId());
        verify(parkingSpotRepository).findByIdWithLock(spot.getId());
    }

    @Test
    @DisplayName("create - idempotency key already used - returns existing reservation")
    void create_sameIdempotencyKey_returnsExisting() {
        Reservation existing = savedReservation();
        when(userRepository.findByAuthentikUserId(AUTH_ID)).thenReturn(Optional.of(user));
        when(reservationRepository.findByUserIdAndIdempotencyKey(user.getId(), "idem-key-1"))
            .thenReturn(Optional.of(existing));

        ReservationResponse resp = reservationService.create(AUTH_ID, "idem-key-1", request(null));

        assertThat(resp.reservationId()).isEqualTo(existing.getId());
        verify(reservationRepository, never()).save(any());
    }

    // ── Validation errors ───────────────────────────────────────────────────

    @Test
    @DisplayName("create - arrival in the past - throws UnprocessableEntityException")
    void create_arrivalInPast_throwsUnprocessable() {
        String past = OffsetDateTime.now(ZoneOffset.UTC).minusHours(1).toString();
        CreateReservationRequest req = new CreateReservationRequest(lot.getId(), vehicle.getId(), past, DEPARTURE.toString(), null);
        assertThatThrownBy(() ->
            reservationService.create(AUTH_ID, null, req))
            .isInstanceOf(UnprocessableEntityException.class);
    }

    @Test
    @DisplayName("create - departure before arrival - throws UnprocessableEntityException")
    void create_departureBefore_throwsUnprocessable() {
        stubUserAndLotAndVehicle();
        String arrival = ARRIVAL.toString();
        String departure = ARRIVAL.minusMinutes(10).toString();
        CreateReservationRequest req = new CreateReservationRequest(lot.getId(), vehicle.getId(), arrival, departure, null);
        assertThatThrownBy(() ->
            reservationService.create(AUTH_ID, null, req))
            .isInstanceOf(UnprocessableEntityException.class);
    }

    @Test
    @DisplayName("create - less than 30 min in advance - throws UnprocessableEntityException")
    void create_tooSoon_throwsUnprocessable() {
        stubUserAndLotAndVehicle();
        String soon = OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(10).toString();
        String departure = OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(70).toString();
        CreateReservationRequest req = new CreateReservationRequest(lot.getId(), vehicle.getId(), soon, departure, null);
        assertThatThrownBy(() ->
            reservationService.create(AUTH_ID, null, req))
            .isInstanceOf(UnprocessableEntityException.class);
    }

    @Test
    @DisplayName("create - arrival outside opening hours - throws UnprocessableEntityException")
    void create_offHours_throwsUnprocessable() {
        stubUserAndLotAndVehicle();
        lot.setOpeningHours("08:00-20:00");
        // arrival at 21:00 UTC
        OffsetDateTime lateArrival = OffsetDateTime.now(ZoneOffset.UTC)
            .withHour(21).withMinute(0).withSecond(0).withNano(0).plusDays(1);
        OffsetDateTime lateDeparture = lateArrival.plusHours(1);
        CreateReservationRequest req = new CreateReservationRequest(lot.getId(), vehicle.getId(),
                lateArrival.toString(), lateDeparture.toString(), null);
        assertThatThrownBy(() ->
            reservationService.create(AUTH_ID, null, req))
            .isInstanceOf(UnprocessableEntityException.class)
            .hasMessageContaining("opening hours");
    }

    @Test
    @DisplayName("create - opening hours in 08h00-22h00 format are validated")
    void create_hFormatOpeningHours_isValidated() {
        stubUserAndLotAndVehicle();
        lot.setOpeningHours("08h00-22h00");
        OffsetDateTime lateArrival = ARRIVAL.withHour(23);
        OffsetDateTime lateDeparture = lateArrival.plusMinutes(30);
        CreateReservationRequest req = new CreateReservationRequest(
            lot.getId(), vehicle.getId(), lateArrival.toString(), lateDeparture.toString(), null);

        assertThatThrownBy(() -> reservationService.create(AUTH_ID, null, req))
            .isInstanceOf(UnprocessableEntityException.class)
            .hasMessageContaining("opening hours");
    }

    @Test
    @DisplayName("create - non-24h reservation spanning multiple dates is rejected")
    void create_multiDayNon24h_throwsUnprocessable() {
        stubUserAndLotAndVehicle();
        lot.setOpeningHours("20:00-06:00");
        OffsetDateTime arrival = ARRIVAL.withHour(21);
        OffsetDateTime departure = arrival.plusDays(1);
        CreateReservationRequest req = new CreateReservationRequest(
            lot.getId(), vehicle.getId(), arrival.toString(), departure.toString(), null);

        assertThatThrownBy(() -> reservationService.create(AUTH_ID, null, req))
            .isInstanceOf(UnprocessableEntityException.class)
            .hasMessageContaining("spanning multiple dates");
    }

    // ── Conflict errors ─────────────────────────────────────────────────────

    @Test
    @DisplayName("create - lot fully booked - throws ConflictException")
    void create_lotFull_throwsConflict() {
        lot.setTotalSpaces(5);
        stubHappyPath(5, 0, 0, Collections.emptyList()); // 5 == totalSpaces

        CreateReservationRequest req = request(null);
        assertThatThrownBy(() -> reservationService.create(AUTH_ID, null, req))
            .isInstanceOf(ConflictException.class)
            .hasMessageContaining("fully booked");
    }

    @Test
    @DisplayName("create - vehicle already booked at same lot - throws ConflictException")
    void create_vehicleDoubleBook_throwsConflict() {
        stubHappyPath(0, 1, 0, Collections.emptyList()); // 1 vehicle conflict

        CreateReservationRequest req = request(null);
        assertThatThrownBy(() -> reservationService.create(AUTH_ID, null, req))
            .isInstanceOf(ConflictException.class)
            .hasMessageContaining("vehicle already has an active reservation");
    }

    @Test
    @DisplayName("create - selected spot already reserved - throws ConflictException")
    void create_spotConflict_throwsConflict() {
        ParkingSpot spot = freeSpot();
        stubUserAndLotAndVehicle();
        when(reservationRepository.expireTimedOutLocks(any(OffsetDateTime.class),
            eq(ReservationStatus.CONFIRMED), eq(ReservationStatus.EXPIRED))).thenReturn(0);
        when(reservationRepository.countLotReservations(any(), any(), any())).thenReturn(0L);
        when(reservationRepository.countVehicleConflicts(any(), any(), any(), any())).thenReturn(0L);
        when(occupancySnapshotRepository.sumFreeSpacesFromLatestSnapshot(lot.getId())).thenReturn(-1);
        when(reservationRepository.spotBelongsToPark(spot.getId(), lot.getId())).thenReturn(true);
        when(parkingSpotRepository.findByIdWithLock(spot.getId())).thenReturn(Optional.of(spot));
        when(reservationRepository.countSpotConflicts(eq(spot.getId()), any(), any())).thenReturn(1L);

        CreateReservationRequest req = request(spot.getId());
        assertThatThrownBy(() ->
            reservationService.create(AUTH_ID, null, req))
            .isInstanceOf(ConflictException.class)
            .hasMessageContaining("already has a reservation");
    }

    @Test
    @DisplayName("create - selected spot occupied status - throws ConflictException")
    void create_spotOccupied_throwsConflict() {
        ParkingSpot spot = new ParkingSpot();
        spot.setId(UUID.randomUUID());
        spot.setStatus("occupied");
        spot.setSpotNumber("A1");
        spot.setZone(ZoneType.STANDARD);
        spot.setSpotRow(0);
        spot.setSpotCol(0);
        spot.setParkingLot(lot);

        stubUserAndLotAndVehicle();
        when(reservationRepository.expireTimedOutLocks(any(OffsetDateTime.class),
            eq(ReservationStatus.CONFIRMED), eq(ReservationStatus.EXPIRED))).thenReturn(0);
        when(reservationRepository.countLotReservations(any(), any(), any())).thenReturn(0L);
        when(reservationRepository.countVehicleConflicts(any(), any(), any(), any())).thenReturn(0L);
        when(occupancySnapshotRepository.sumFreeSpacesFromLatestSnapshot(lot.getId())).thenReturn(-1);
        when(reservationRepository.spotBelongsToPark(spot.getId(), lot.getId())).thenReturn(true);
        when(parkingSpotRepository.findByIdWithLock(spot.getId())).thenReturn(Optional.of(spot));

        CreateReservationRequest req = request(spot.getId());
        assertThatThrownBy(() ->
            reservationService.create(AUTH_ID, null, req))
            .isInstanceOf(ConflictException.class)
            .hasMessageContaining("not available");
    }

    @Test
    @DisplayName("create - spot doesn't belong to park - throws UnprocessableEntityException")
    void create_spotNotInPark_throwsUnprocessable() {
        ParkingSpot spot = freeSpot();
        stubUserAndLotAndVehicle();
        when(reservationRepository.expireTimedOutLocks(any(OffsetDateTime.class),
            eq(ReservationStatus.CONFIRMED), eq(ReservationStatus.EXPIRED))).thenReturn(0);
        when(reservationRepository.countLotReservations(any(), any(), any())).thenReturn(0L);
        when(reservationRepository.countVehicleConflicts(any(), any(), any(), any())).thenReturn(0L);
        when(occupancySnapshotRepository.sumFreeSpacesFromLatestSnapshot(lot.getId())).thenReturn(-1);
        when(reservationRepository.spotBelongsToPark(spot.getId(), lot.getId())).thenReturn(false);

        CreateReservationRequest req = request(spot.getId());
        assertThatThrownBy(() ->
            reservationService.create(AUTH_ID, null, req))
            .isInstanceOf(UnprocessableEntityException.class);
    }

    @Test
    @DisplayName("create - vehicle not owned by user - throws ResourceNotFoundException")
    void create_vehicleNotOwned_throwsNotFound() {
        when(userRepository.findByAuthentikUserId(AUTH_ID)).thenReturn(Optional.of(user));
        when(parkingLotRepository.findById(lot.getId())).thenReturn(Optional.of(lot));
        when(vehicleRepository.findByIdAndUserId(vehicle.getId(), user.getId())).thenReturn(Optional.empty());

        CreateReservationRequest req = request(null);
        assertThatThrownBy(() -> reservationService.create(AUTH_ID, null, req))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("create - cost capped at maxDaily tariff")
    void create_longStay_costCappedAtMaxDaily() {
        // 10 hours * 1.50 = 15.00, capped at 12.00
        OffsetDateTime longDeparture = ARRIVAL.plusHours(10);
        CreateReservationRequest req = new CreateReservationRequest(
            lot.getId(), vehicle.getId(), ARRIVAL.toString(), longDeparture.toString(), null);
        stubHappyPath(0, 0, 0, Collections.emptyList());
        stubSave();

        ReservationResponse resp = reservationService.create(AUTH_ID, null, req);

        assertThat(resp.estimatedCost()).isEqualByComparingTo("12.00");
    }

    @Test
    @DisplayName("list - returns reservations belonging to authenticated user")
    void list_returnsUserReservations() {
        Reservation reservation = savedReservation();
        when(userRepository.findByAuthentikUserId(AUTH_ID)).thenReturn(Optional.of(user));
        when(reservationRepository.findByUserIdOrderByCreatedAtDesc(user.getId()))
            .thenReturn(List.of(reservation));

        List<ReservationResponse> responses = reservationService.list(AUTH_ID);

        assertThat(responses).hasSize(1);
        assertThat(responses.getFirst().reservationId()).isEqualTo(reservation.getId());
    }

    @Test
    @DisplayName("getById - owned reservation - returns details")
    void getById_ownedReservation_returnsDetails() {
        Reservation reservation = savedReservation();
        when(userRepository.findByAuthentikUserId(AUTH_ID)).thenReturn(Optional.of(user));
        when(reservationRepository.findByIdAndUserId(reservation.getId(), user.getId()))
            .thenReturn(Optional.of(reservation));

        ReservationResponse response = reservationService.getById(AUTH_ID, reservation.getId());

        assertThat(response.reservationId()).isEqualTo(reservation.getId());
        assertThat(response.bookingCode()).isEqualTo(reservation.getBookingCode());
    }

    @Test
    @DisplayName("update - future confirmed reservation - updates times and spot")
    void update_futureReservation_updatesReservation() {
        ParkingSpot currentSpot = freeSpot();
        ParkingSpot nextSpot = freeSpot();
        nextSpot.setId(UUID.randomUUID());
        nextSpot.setSpotNumber("A2");

        Reservation reservation = savedReservation();
        reservation.setUser(user);
        reservation.setParkingSpot(currentSpot);

        UpdateReservationRequest request = new UpdateReservationRequest(
            lot.getId(),
            vehicle.getId(),
            ARRIVAL.plusHours(1).toString(),
            DEPARTURE.plusHours(1).toString(),
            nextSpot.getId()
        );

        when(userRepository.findByAuthentikUserId(AUTH_ID)).thenReturn(Optional.of(user));
        when(reservationRepository.expireTimedOutLocks(any(), eq(ReservationStatus.CONFIRMED), eq(ReservationStatus.EXPIRED)))
            .thenReturn(0);
        when(reservationRepository.findByIdAndUserIdWithDetails(reservation.getId(), user.getId()))
            .thenReturn(Optional.of(reservation));
        when(parkingLotRepository.findById(lot.getId())).thenReturn(Optional.of(lot));
        when(vehicleRepository.findByIdAndUserId(vehicle.getId(), user.getId())).thenReturn(Optional.of(vehicle));
        when(occupancySnapshotRepository.sumFreeSpacesFromLatestSnapshot(lot.getId())).thenReturn(-1);
        when(reservationRepository.countLotReservationsExcludingReservation(eq(lot.getId()), eq(reservation.getId()), any(), any()))
            .thenReturn(0L);
        when(reservationRepository.countVehicleConflictsExcludingReservation(eq(vehicle.getId()), eq(lot.getId()), eq(reservation.getId()), any(), any()))
            .thenReturn(0L);
        when(reservationRepository.spotBelongsToPark(nextSpot.getId(), lot.getId())).thenReturn(true);
        when(parkingSpotRepository.findByIdWithLock(nextSpot.getId())).thenReturn(Optional.of(nextSpot));
        when(reservationRepository.countSpotConflictsExcludingReservation(eq(nextSpot.getId()), eq(reservation.getId()), any(), any()))
            .thenReturn(0L);
        when(tariffRepository.findByParkingLotId(lot.getId())).thenReturn(List.of(tariff));
        when(reservationRepository.save(any(Reservation.class))).thenAnswer(inv -> inv.getArgument(0));

        pt.ua.deti.apieasyspot.booking.dto.ReservationUpdateResponse updateResponse =
            reservationService.update(AUTH_ID, reservation.getId(), request);
        ReservationResponse response = updateResponse.reservation();

        assertThat(response.spotId()).isEqualTo(nextSpot.getId());
        assertThat(response.arrivalDateTime()).isEqualTo(ARRIVAL.plusHours(1));
        verify(parkingSpotRepository).save(currentSpot);
        verify(parkingSpotRepository).save(nextSpot);
    }

    @Test
    @DisplayName("update - extra charge declined - throws UnprocessableEntityException")
    void update_chargeDeclined_throwsUnprocessableEntity() {
        ParkingSpot currentSpot = freeSpot();
        Reservation reservation = savedReservation();
        reservation.setUser(user);
        reservation.setParkingSpot(currentSpot);
        reservation.setEstimatedCost(new BigDecimal("3.00"));
        ReflectionTestUtils.setField(reservationService, "reservationBillingEnabled", true);

        UpdateReservationRequest request = new UpdateReservationRequest(
            lot.getId(),
            vehicle.getId(),
            ARRIVAL.plusHours(2).toString(),
            DEPARTURE.plusHours(3).toString(),
            currentSpot.getId()
        );

        when(userRepository.findByAuthentikUserId(AUTH_ID)).thenReturn(Optional.of(user));
        when(reservationRepository.expireTimedOutLocks(any(), eq(ReservationStatus.CONFIRMED), eq(ReservationStatus.EXPIRED)))
            .thenReturn(0);
        when(reservationRepository.findByIdAndUserIdWithDetails(reservation.getId(), user.getId()))
            .thenReturn(Optional.of(reservation));
        when(parkingLotRepository.findById(lot.getId())).thenReturn(Optional.of(lot));
        when(vehicleRepository.findByIdAndUserId(vehicle.getId(), user.getId())).thenReturn(Optional.of(vehicle));
        when(occupancySnapshotRepository.sumFreeSpacesFromLatestSnapshot(lot.getId())).thenReturn(-1);
        when(reservationRepository.countLotReservationsExcludingReservation(eq(lot.getId()), eq(reservation.getId()), any(), any()))
            .thenReturn(0L);
        when(reservationRepository.countVehicleConflictsExcludingReservation(eq(vehicle.getId()), eq(lot.getId()), eq(reservation.getId()), any(), any()))
            .thenReturn(0L);
        when(reservationRepository.spotBelongsToPark(currentSpot.getId(), lot.getId())).thenReturn(true);
        when(parkingSpotRepository.findByIdWithLock(currentSpot.getId())).thenReturn(Optional.of(currentSpot));
        when(reservationRepository.countSpotConflictsExcludingReservation(eq(currentSpot.getId()), eq(reservation.getId()), any(), any()))
            .thenReturn(0L);
        when(tariffRepository.findByParkingLotId(lot.getId())).thenReturn(List.of(tariff));
        when(reservationRepository.save(any(Reservation.class))).thenAnswer(inv -> inv.getArgument(0));
        when(billingService.adjustPaymentForReservation(any(Reservation.class), any(BigDecimal.class), any(BigDecimal.class), anyString()))
            .thenReturn(new BillingService.PaymentAdjustmentResult(
                new BigDecimal("1.50"),
                "CHARGE_FAILED",
                null,
                "card_declined"
            ));

        assertThatThrownBy(() -> reservationService.update(AUTH_ID, reservation.getId(), request))
            .isInstanceOf(UnprocessableEntityException.class)
            .hasMessageContaining("cartão guardado foi recusado");

        verify(confirmationMailService, never()).sendUpdate(any(), any(), any(), any(), any());
        verify(realtimeNotifier, never()).notifyUpdated(any(), any(), any());
    }

    @Test
    @DisplayName("update - reservation after arrival - throws ConflictException")
    void update_startedReservation_throwsConflict() {
        Reservation reservation = savedReservation();
        reservation.setUser(user);
        reservation.setArrivalTime(OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(5));
        reservation.setDepartureTime(OffsetDateTime.now(ZoneOffset.UTC).plusHours(1));

        when(userRepository.findByAuthentikUserId(AUTH_ID)).thenReturn(Optional.of(user));
        when(reservationRepository.expireTimedOutLocks(any(), eq(ReservationStatus.CONFIRMED), eq(ReservationStatus.EXPIRED)))
            .thenReturn(0);
        when(reservationRepository.findByIdAndUserIdWithDetails(reservation.getId(), user.getId()))
            .thenReturn(Optional.of(reservation));

        UpdateReservationRequest request = new UpdateReservationRequest(
            lot.getId(), vehicle.getId(), ARRIVAL.toString(), DEPARTURE.toString(), null);

        assertThatThrownBy(() -> reservationService.update(AUTH_ID, reservation.getId(), request))
            .isInstanceOf(ConflictException.class)
            .hasMessageContaining("can no longer be updated");
    }

    @Test
    @DisplayName("cancel - future confirmed reservation - marks reservation cancelled")
    void cancel_futureReservation_marksCancelled() {
        ParkingSpot currentSpot = freeSpot();
        Reservation reservation = savedReservation();
        reservation.setUser(user);
        reservation.setParkingSpot(currentSpot);

        when(userRepository.findByAuthentikUserId(AUTH_ID)).thenReturn(Optional.of(user));
        when(reservationRepository.expireTimedOutLocks(any(), eq(ReservationStatus.CONFIRMED), eq(ReservationStatus.EXPIRED)))
            .thenReturn(0);
        when(reservationRepository.findByIdAndUserIdWithDetails(reservation.getId(), user.getId()))
            .thenReturn(Optional.of(reservation));
        when(reservationRepository.save(any(Reservation.class))).thenAnswer(inv -> inv.getArgument(0));

        ReservationResponse response = reservationService.cancel(AUTH_ID, reservation.getId());

        assertThat(response.status()).isEqualTo(ReservationStatus.CANCELLED.name());
        assertThat(reservation.getLockedUntil()).isNull();
        verify(parkingSpotRepository).save(currentSpot);
        verify(eventPublisher).publishCancelled(reservation);
    }

    @Test
    @DisplayName("cancel - already cancelled reservation - throws ConflictException")
    void cancel_terminalReservation_throwsConflict() {
        Reservation reservation = savedReservation();
        reservation.setUser(user);
        reservation.setStatus(ReservationStatus.CANCELLED);

        when(userRepository.findByAuthentikUserId(AUTH_ID)).thenReturn(Optional.of(user));
        when(reservationRepository.expireTimedOutLocks(any(), eq(ReservationStatus.CONFIRMED), eq(ReservationStatus.EXPIRED)))
            .thenReturn(0);
        when(reservationRepository.findByIdAndUserIdWithDetails(reservation.getId(), user.getId()))
            .thenReturn(Optional.of(reservation));

        assertThatThrownBy(() -> reservationService.cancel(AUTH_ID, reservation.getId()))
            .isInstanceOf(ConflictException.class)
            .hasMessageContaining("Only confirmed reservations");
    }

    // ── Lock expiry ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("create - lazy expiry runs before conflict check")
    void create_lazyExpiryRunsFirst() {
        stubHappyPath(0, 0, 0, Collections.emptyList());
        stubSave();

        reservationService.create(AUTH_ID, null, request(null));

        verify(reservationRepository).expireTimedOutLocks(any(OffsetDateTime.class),
            eq(ReservationStatus.CONFIRMED), eq(ReservationStatus.EXPIRED));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private CreateReservationRequest request(UUID spotId) {
        return new CreateReservationRequest(
            lot.getId(), vehicle.getId(), ARRIVAL.toString(), DEPARTURE.toString(), spotId);
    }

    private void stubUserAndLotAndVehicle() {
        when(userRepository.findByAuthentikUserId(AUTH_ID)).thenReturn(Optional.of(user));
        when(parkingLotRepository.findById(lot.getId())).thenReturn(Optional.of(lot));
        when(vehicleRepository.findByIdAndUserId(vehicle.getId(), user.getId())).thenReturn(Optional.of(vehicle));
    }

    private void stubHappyPath(long lotConflicts, long vehicleConflicts,
                               long spotConflicts, List<ParkingSpot> freeSpots) {
        stubUserAndLotAndVehicle();
        when(reservationRepository.expireTimedOutLocks(any(OffsetDateTime.class),
            eq(ReservationStatus.CONFIRMED), eq(ReservationStatus.EXPIRED))).thenReturn(0);
        when(reservationRepository.countLotReservations(eq(lot.getId()), any(), any()))
            .thenReturn(lotConflicts);
        when(reservationRepository.countVehicleConflicts(eq(vehicle.getId()), eq(lot.getId()), any(), any()))
            .thenReturn(vehicleConflicts);
        when(occupancySnapshotRepository.sumFreeSpacesFromLatestSnapshot(lot.getId())).thenReturn(-1);
        when(tariffRepository.findByParkingLotId(lot.getId())).thenReturn(List.of(tariff));
        Optional<ParkingSpot> first = freeSpots.isEmpty() ? Optional.empty() : Optional.of(freeSpots.get(0));
        when(parkingSpotRepository.findFirstFreeByParkingLotIdForUpdateSkipLocked(
            eq(lot.getId()), eq("free"), any(), any())).thenReturn(first);
    }

    private void stubSave() {
        when(reservationRepository.existsByBookingCode(anyString())).thenReturn(false);
        when(reservationRepository.save(any(Reservation.class))).thenAnswer(inv -> {
            Reservation r = inv.getArgument(0);
            r.setId(UUID.randomUUID());
            return r;
        });
    }

    private ParkingSpot freeSpot() {
        ParkingSpot spot = new ParkingSpot();
        spot.setId(UUID.randomUUID());
        spot.setSpotNumber("A1");
        spot.setStatus("free");
        spot.setZone(ZoneType.STANDARD);
        spot.setSpotRow(0);
        spot.setSpotCol(0);
        spot.setParkingLot(lot);
        return spot;
    }

    private Reservation savedReservation() {
        Reservation r = new Reservation();
        r.setId(UUID.randomUUID());
        r.setBookingCode("ES-ABCD-EFGH");
        r.setStatus(ReservationStatus.CONFIRMED);
        r.setArrivalTime(ARRIVAL);
        r.setDepartureTime(DEPARTURE);
        r.setLockedUntil(ARRIVAL.plusMinutes(30));
        r.setEstimatedCost(new BigDecimal("3.00"));
        r.setParkingLot(lot);
        r.setVehicle(vehicle);
        return r;
    }
}
