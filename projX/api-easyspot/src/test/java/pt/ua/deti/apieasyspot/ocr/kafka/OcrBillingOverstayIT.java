package pt.ua.deti.apieasyspot.ocr.kafka;

import com.stripe.model.PaymentIntent;
import com.stripe.model.PaymentMethod;
import com.stripe.model.PaymentMethodCollection;
import com.stripe.net.RequestOptions;
import com.stripe.param.PaymentIntentCreateParams;
import com.stripe.param.PaymentMethodListParams;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import pt.ua.deti.apieasyspot.TestTimescaleDataSourceConfig;
import pt.ua.deti.apieasyspot.TestcontainersConfiguration;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.billing.model.PaymentRecord;
import pt.ua.deti.apieasyspot.billing.model.PaymentStatus;
import pt.ua.deti.apieasyspot.billing.model.ParkingSession;
import pt.ua.deti.apieasyspot.billing.repository.PaymentRecordRepository;
import pt.ua.deti.apieasyspot.billing.repository.TimescaleParkingSessionRepository;
import pt.ua.deti.apieasyspot.billing.service.BillingService;
import pt.ua.deti.apieasyspot.booking.model.Reservation;
import pt.ua.deti.apieasyspot.booking.model.ReservationStatus;
import pt.ua.deti.apieasyspot.booking.repository.ReservationRepository;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingSpot;
import pt.ua.deti.apieasyspot.occupancy.model.Tariff;
import pt.ua.deti.apieasyspot.occupancy.model.TariffStatus;
import pt.ua.deti.apieasyspot.occupancy.model.ZoneType;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingSpotRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.TariffRepository;
import pt.ua.deti.apieasyspot.vehicle.model.Vehicle;
import pt.ua.deti.apieasyspot.vehicle.repository.VehicleRepository;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

@ActiveProfiles("test")
@SpringBootTest
@Import({TestcontainersConfiguration.class, TestTimescaleDataSourceConfig.class})
class OcrBillingOverstayIT {

    @Autowired private OcrPlateEventKafkaListener listener;
    @Autowired private BillingService billingService;
    @Autowired private UserRepository userRepository;
    @Autowired private VehicleRepository vehicleRepository;
    @Autowired private ParkingLotRepository parkingLotRepository;
    @Autowired private ParkingSpotRepository parkingSpotRepository;
    @Autowired private TariffRepository tariffRepository;
    @Autowired private ReservationRepository reservationRepository;
    @Autowired private PaymentRecordRepository paymentRecordRepository;
    @Autowired private TimescaleParkingSessionRepository parkingSessionRepository;

    private Reservation reservation;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(billingService, "stripeSecretKey", "sk_test_123");

        paymentRecordRepository.deleteAll();
        reservationRepository.deleteAll();
        tariffRepository.deleteAll();
        parkingSpotRepository.deleteAll();
        parkingLotRepository.deleteAll();
        vehicleRepository.deleteAll();
        userRepository.deleteAll();
        parkingSessionRepository.deleteAll();

        User user = new User();
        user.setEmail("driver-overstay@example.com");
        user.setName("Driver Overstay");
        user.setAuthentikUserId("driver-overstay");
        user.setRole("DRIVER");
        user.setStripeCustomerId("cus_overstay_123");
        user = userRepository.save(user);

        Vehicle vehicle = new Vehicle();
        vehicle.setUser(user);
        vehicle.setPlate("AA-11-BB");
        vehicle.setMake("Test");
        vehicle.setModel("Car");
        vehicle.setYear(2022);
        vehicle.setFuelType("Gasoline");
        vehicle.setEv(false);
        vehicle.setAccessible(false);
        vehicle.setPrimary(true);
        vehicle = vehicleRepository.save(vehicle);

        ParkingLot lot = new ParkingLot();
        lot.setName("Lot Overstay");
        lot.setCity("Aveiro");
        lot.setAddress("Rua Teste 1");
        lot.setLatitude(40.64);
        lot.setLongitude(-8.65);
        lot.setTotalSpaces(100);
        lot = parkingLotRepository.save(lot);

        ParkingSpot spot = new ParkingSpot();
        spot.setParkingLot(lot);
        spot.setSpotNumber("A01");
        spot.setSpotRow(1);
        spot.setSpotCol(1);
        spot.setZone(ZoneType.STANDARD);
        spot.setStatus("reserved");
        spot = parkingSpotRepository.save(spot);

        Tariff tariff = new Tariff();
        tariff.setParkingLot(lot);
        tariff.setName("Standard");
        tariff.setPricePerHour(new BigDecimal("2.00"));
        tariff.setMaxDaily(new BigDecimal("50.00"));
        tariff.setStatus(TariffStatus.ACTIVE);
        tariffRepository.save(tariff);

        OffsetDateTime arrival = OffsetDateTime.now(ZoneOffset.UTC).minusHours(3);
        OffsetDateTime departure = arrival.plusHours(1);

        Reservation r = new Reservation();
        r.setUser(user);
        r.setVehicle(vehicle);
        r.setParkingLot(lot);
        r.setParkingSpot(spot);
        r.setArrivalTime(arrival);
        r.setDepartureTime(departure);
        r.setStatus(ReservationStatus.CONFIRMED);
        r.setLockedUntil(arrival.plusMinutes(30));
        r.setEstimatedCost(new BigDecimal("2.00"));
        r.setBookingCode("ES-OVERSTAY-001");
        reservation = reservationRepository.save(r);

        ParkingSession session = new ParkingSession();
        session.setId(reservation.getId());
        session.setReservationId(reservation.getId());
        session.setUserId(user.getId());
        session.setVehicleId(vehicle.getId());
        session.setParkingLotId(lot.getId());
        session.setZoneType(ZoneType.STANDARD);
        session.setEntryTime(arrival);
        session.setExitTime(departure);
        session.setRevenueEuros(new BigDecimal("2.00"));
        parkingSessionRepository.save(session);
    }

    @Test
    @DisplayName("OCR entry + overstay exit updates session and records extra billing")
    void ocrExitOverstay_settlesExtraAndUpdatesTimeseries() {
        OffsetDateTime actualEntry = reservation.getArrivalTime().plusMinutes(5);
        String entryPayload = """
            {
              "eventId": "%s",
              "eventType": "ocr.plate.read",
              "parkId": "%s",
              "spotId": "%s",
              "occurredAt": "%s",
              "version": 1,
              "payload": {
                "plate": "%s",
                "confidence": 0.98,
                "direction": "entry"
              }
            }
            """.formatted(
            UUID.randomUUID(),
            reservation.getParkingLot().getId(),
            reservation.getParkingSpot().getId(),
            actualEntry.toInstant(),
            reservation.getVehicle().getPlate()
        );

        listener.onEvent(entryPayload);

        PaymentMethod paymentMethod = mock(PaymentMethod.class);
        when(paymentMethod.getId()).thenReturn("pm_overstay_123");
        PaymentMethodCollection paymentMethods = mock(PaymentMethodCollection.class);
        when(paymentMethods.getData()).thenReturn(List.of(paymentMethod));
        PaymentIntent intent = mock(PaymentIntent.class);
        when(intent.getId()).thenReturn("pi_overstay_delta_123");
        when(intent.getStatus()).thenReturn("succeeded");

        OffsetDateTime actualExit = reservation.getDepartureTime().plusHours(2);
        String exitPayload = """
            {
              "eventId": "%s",
              "eventType": "ocr.plate.read",
              "parkId": "%s",
              "spotId": "%s",
              "occurredAt": "%s",
              "version": 1,
              "payload": {
                "plate": "%s",
                "confidence": 0.97,
                "direction": "exit"
              }
            }
            """.formatted(
            UUID.randomUUID(),
            reservation.getParkingLot().getId(),
            reservation.getParkingSpot().getId(),
            actualExit.toInstant(),
            reservation.getVehicle().getPlate()
        );

        try (
            MockedStatic<PaymentMethod> paymentMethodStatic = mockStatic(PaymentMethod.class);
            MockedStatic<PaymentIntent> paymentIntentStatic = mockStatic(PaymentIntent.class)
        ) {
            paymentMethodStatic
                .when(() -> PaymentMethod.list(any(PaymentMethodListParams.class), any(RequestOptions.class)))
                .thenReturn(paymentMethods);
            paymentIntentStatic
                .when(() -> PaymentIntent.create(any(PaymentIntentCreateParams.class), any(RequestOptions.class)))
                .thenReturn(intent);

            listener.onEvent(exitPayload);
        }

        Reservation updatedReservation = reservationRepository.findById(reservation.getId()).orElseThrow();
        assertThat(updatedReservation.getStatus()).isEqualTo(ReservationStatus.COMPLETED);

        List<ParkingSession> active = parkingSessionRepository.findActiveByParkingLotId(
            reservation.getParkingLot().getId(),
            reservation.getArrivalTime().minusHours(1)
        );
        Optional<ParkingSession> maybeSession = active.stream()
            .filter(s -> reservation.getId().equals(s.getReservationId()))
            .findFirst();
        assertThat(maybeSession).isPresent();
        ParkingSession session = maybeSession.orElseThrow();
        assertThat(session.getEntryTime()).isEqualTo(actualEntry.withOffsetSameInstant(ZoneOffset.UTC));
        assertThat(session.getExitTime()).isEqualTo(actualExit.withOffsetSameInstant(ZoneOffset.UTC));
        assertThat(session.getRevenueEuros()).isEqualTo(new BigDecimal("6.00"));

        List<PaymentRecord> records = paymentRecordRepository.findAll().stream()
            .filter(r -> reservation.getId().equals(r.getReservationId()))
            .toList();
        assertThat(records).isNotEmpty();
        assertThat(records.stream().anyMatch(r ->
            new BigDecimal("4.00").compareTo(r.getAmount()) == 0
                && r.getStatus() == PaymentStatus.COMPLETED
                && "pi_overstay_delta_123".equals(r.getPaymentIntentId())
        )).isTrue();
    }
}

