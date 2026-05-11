package pt.ua.deti.apieasyspot.booking.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import pt.ua.deti.apieasyspot.TestcontainersConfiguration;
import pt.ua.deti.apieasyspot.TestTimescaleDataSourceConfig;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.billing.service.BillingService;
import pt.ua.deti.apieasyspot.booking.dto.CreateReservationRequest;
import pt.ua.deti.apieasyspot.booking.dto.UpdateReservationRequest;
import pt.ua.deti.apieasyspot.booking.event.ReservationEventPublisher;
import pt.ua.deti.apieasyspot.booking.model.Reservation;
import pt.ua.deti.apieasyspot.booking.model.ReservationStatus;
import pt.ua.deti.apieasyspot.booking.repository.ReservationRepository;
import pt.ua.deti.apieasyspot.booking.service.BookingConfirmationMailService;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingSpot;
import pt.ua.deti.apieasyspot.occupancy.model.Tariff;
import pt.ua.deti.apieasyspot.occupancy.model.ZoneType;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingSpotRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.TariffRepository;
import pt.ua.deti.apieasyspot.vehicle.model.Vehicle;
import pt.ua.deti.apieasyspot.vehicle.repository.VehicleRepository;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static pt.ua.deti.apieasyspot.support.TestJwtRequests.jwtWithRole;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.kafka.KafkaAutoConfiguration",
    "spring.main.allow-bean-definition-overriding=true"
})
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Import({TestcontainersConfiguration.class, TestTimescaleDataSourceConfig.class})
class ReservationControllerIT {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired ParkingLotRepository parkingLotRepository;
    @Autowired ParkingSpotRepository parkingSpotRepository;
    @Autowired TariffRepository tariffRepository;
    @Autowired VehicleRepository vehicleRepository;
    @Autowired ReservationRepository reservationRepository;

    @MockitoBean JwtDecoder jwtDecoder;
    @MockitoBean ReservationEventPublisher eventPublisher;
    @MockitoBean BillingService billingService;
    @MockitoBean BookingConfirmationMailService confirmationMailService;

    private User user;
    private ParkingLot lot;
    private ParkingSpot spot;
    private Vehicle vehicle;

    @BeforeEach
    void setUp() {
        reservationRepository.deleteAll();
        vehicleRepository.deleteAll();
        parkingSpotRepository.deleteAll();
        tariffRepository.deleteAll();
        parkingLotRepository.deleteAll();
        userRepository.deleteAll();

        user = new User();
        user.setAuthentikUserId("auth-sub-123");
        user.setEmail("driver@test.com");
        user.setName("Test Driver");
        user.setRole("DRIVER");
        user = userRepository.save(user);

        lot = new ParkingLot();
        lot.setName("Parque Central");
        lot.setCity("Aveiro");
        lot.setAddress("Rua Central, 1");
        lot.setLatitude(40.6405);
        lot.setLongitude(-8.6538);
        lot.setTotalSpaces(10);
        lot = parkingLotRepository.save(lot);

        spot = new ParkingSpot();
        spot.setParkingLot(lot);
        spot.setSpotNumber("A01");
        spot.setZone(ZoneType.STANDARD);
        spot.setSpotRow(1);
        spot.setSpotCol(1);
        spot.setStatus("free");
        spot = parkingSpotRepository.save(spot);

        Tariff tariff = new Tariff();
        tariff.setParkingLot(lot);
        tariff.setName("Standard");
        tariff.setPricePerHour(new BigDecimal("1.50"));
        tariffRepository.save(tariff);

        vehicle = new Vehicle();
        vehicle.setUser(user);
        vehicle.setPlate("AA-00-AA");
        vehicle.setMake("Toyota");
        vehicle.setModel("Yaris");
        vehicle.setYear(2020);
        vehicle.setFuelType("Gasolina");
        vehicle = vehicleRepository.save(vehicle);
    }

    @Test
    @DisplayName("POST /api/reservations - unauthenticated - returns 401")
    void createReservation_unauthenticated_returns401() throws Exception {
        var body = validRequest();
        mockMvc.perform(post("/api/reservations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/reservations - wrong role - returns 403")
    void createReservation_wrongRole_returns403() throws Exception {
        var body = validRequest();
        mockMvc.perform(post("/api/reservations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body))
                .with(jwtWithRole("auth-sub-123", "MANAGER")))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/reservations - park not found - returns 404")
    void createReservation_parkNotFound_returns404() throws Exception {
        OffsetDateTime arrival = now().plusHours(2);
        var body = new CreateReservationRequest(
            UUID.randomUUID(), vehicle.getId(),
            arrival.toString(), arrival.plusHours(2).toString(), null);

        mockMvc.perform(post("/api/reservations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body))
                .with(jwtWithRole("auth-sub-123", "DRIVER")))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("POST /api/reservations - vehicle not owned - returns 404")
    void createReservation_vehicleNotOwned_returns404() throws Exception {
        OffsetDateTime arrival = now().plusHours(2);
        var body = new CreateReservationRequest(
            lot.getId(), UUID.randomUUID(),
            arrival.toString(), arrival.plusHours(2).toString(), null);

        mockMvc.perform(post("/api/reservations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body))
                .with(jwtWithRole("auth-sub-123", "DRIVER")))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("POST /api/reservations - arrival in the past - returns 422")
    void createReservation_arrivalInPast_returns422() throws Exception {
        OffsetDateTime pastArrival = now().minusHours(1);
        var body = new CreateReservationRequest(
            lot.getId(), vehicle.getId(),
            pastArrival.toString(), pastArrival.plusHours(2).toString(), null);

        mockMvc.perform(post("/api/reservations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body))
                .with(jwtWithRole("auth-sub-123", "DRIVER")))
            .andExpect(status().is(422));
    }

    @Test
    @DisplayName("POST /api/reservations - arrival less than 30 min from now - returns 422")
    void createReservation_arrivalTooSoon_returns422() throws Exception {
        OffsetDateTime arrival = now().plusMinutes(10);
        var body = new CreateReservationRequest(
            lot.getId(), vehicle.getId(),
            arrival.toString(), arrival.plusHours(2).toString(), null);

        mockMvc.perform(post("/api/reservations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body))
                .with(jwtWithRole("auth-sub-123", "DRIVER")))
            .andExpect(status().is(422));
    }

    @Test
    @DisplayName("POST /api/reservations - outside opening hours - returns 422")
    void createReservation_outsideOpeningHours_returns422() throws Exception {
        lot.setOpeningHours("00:00-00:01");
        parkingLotRepository.save(lot);

        var body = validRequest();
        mockMvc.perform(post("/api/reservations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body))
                .with(jwtWithRole("auth-sub-123", "DRIVER")))
            .andExpect(status().is(422));
    }

    @Test
    @DisplayName("POST /api/reservations - lot fully booked - returns 409")
    void createReservation_lotFull_returns409() throws Exception {
        lot.setTotalSpaces(0);
        parkingLotRepository.save(lot);

        var body = validRequest();
        mockMvc.perform(post("/api/reservations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body))
                .with(jwtWithRole("auth-sub-123", "DRIVER")))
            .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("POST /api/reservations - vehicle already reserved at same lot - returns 409")
    void createReservation_vehicleDoubleBook_returns409() throws Exception {
        OffsetDateTime arrival = now().plusHours(2);
        OffsetDateTime departure = arrival.plusHours(2);

        Reservation existing = new Reservation();
        existing.setUser(user);
        existing.setParkingLot(lot);
        existing.setVehicle(vehicle);
        existing.setArrivalTime(arrival.minusHours(1));
        existing.setDepartureTime(departure);
        existing.setStatus(ReservationStatus.CONFIRMED);
        existing.setLockedUntil(arrival.minusHours(1).plusMinutes(30));
        existing.setBookingCode("ES-SEED-TEST");
        reservationRepository.save(existing);

        var body = new CreateReservationRequest(
            lot.getId(), vehicle.getId(),
            arrival.toString(), departure.toString(), null);

        mockMvc.perform(post("/api/reservations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body))
                .with(jwtWithRole("auth-sub-123", "DRIVER")))
            .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("POST /api/reservations - happy path - returns 201 with booking code")
    void createReservation_happyPath_returns201() throws Exception {
        var body = validRequest();
        mockMvc.perform(post("/api/reservations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body))
                .with(jwtWithRole("auth-sub-123", "DRIVER")))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.bookingCode").value(startsWith("ES-")))
            .andExpect(jsonPath("$.parkId").value(lot.getId().toString()))
            .andExpect(jsonPath("$.parkName").value("Parque Central"))
            .andExpect(jsonPath("$.vehicleId").value(vehicle.getId().toString()))
            .andExpect(jsonPath("$.status").value("CONFIRMED"))
            .andExpect(jsonPath("$.estimatedCost").isNumber());
    }

    @Test
    @DisplayName("POST /api/reservations - idempotency key replay - returns same reservation")
    void createReservation_idempotencyKeyReplay_returnsSameReservation() throws Exception {
        var body = validRequest();
        String idempotencyKey = UUID.randomUUID().toString();

        String firstResponse = mockMvc.perform(post("/api/reservations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body))
                .header("Idempotency-Key", idempotencyKey)
                .with(jwtWithRole("auth-sub-123", "DRIVER")))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();

        String secondResponse = mockMvc.perform(post("/api/reservations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body))
                .header("Idempotency-Key", idempotencyKey)
                .with(jwtWithRole("auth-sub-123", "DRIVER")))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();

        var first  = objectMapper.readTree(firstResponse);
        var second = objectMapper.readTree(secondResponse);
        org.assertj.core.api.Assertions.assertThat(first.get("bookingCode").textValue())
            .isEqualTo(second.get("bookingCode").textValue());
    }

    @Test
    @DisplayName("POST /api/reservations - null parkId - returns 400")
    void createReservation_nullParkId_returns400() throws Exception {
        OffsetDateTime arrival = now().plusHours(2);
        var body = new CreateReservationRequest(
            null, vehicle.getId(),
            arrival.toString(), arrival.plusHours(2).toString(), null);

        mockMvc.perform(post("/api/reservations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body))
                .with(jwtWithRole("auth-sub-123", "DRIVER")))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/reservations - null vehicleId - returns 400")
    void createReservation_nullVehicleId_returns400() throws Exception {
        OffsetDateTime arrival = now().plusHours(2);
        var body = new CreateReservationRequest(
            lot.getId(), null,
            arrival.toString(), arrival.plusHours(2).toString(), null);

        mockMvc.perform(post("/api/reservations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body))
                .with(jwtWithRole("auth-sub-123", "DRIVER")))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/reservations - departure before arrival - returns 422")
    void createReservation_departureBeforeArrival_returns422() throws Exception {
        OffsetDateTime arrival = now().plusHours(2);
        var body = new CreateReservationRequest(
            lot.getId(), vehicle.getId(),
            arrival.toString(), arrival.minusHours(1).toString(), null);

        mockMvc.perform(post("/api/reservations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body))
                .with(jwtWithRole("auth-sub-123", "DRIVER")))
            .andExpect(status().is(422));
    }

    @Test
    @DisplayName("POST /api/reservations - with selectedSpotId - returns 201")
    void createReservation_withSelectedSpot_returns201() throws Exception {
        OffsetDateTime arrival = now().plusHours(2);
        var body = new CreateReservationRequest(
            lot.getId(), vehicle.getId(),
            arrival.toString(), arrival.plusHours(2).toString(), spot.getId());

        mockMvc.perform(post("/api/reservations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body))
                .with(jwtWithRole("auth-sub-123", "DRIVER")))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.spotId").value(spot.getId().toString()));
    }

    @Test
    @DisplayName("POST /api/reservations - spot already reserved - returns 409")
    void createReservation_spotAlreadyReserved_returns409() throws Exception {
        OffsetDateTime arrival = now().plusHours(2);
        OffsetDateTime departure = arrival.plusHours(2);

        // First reservation claims the spot
        Reservation existing = new Reservation();
        existing.setUser(user);
        existing.setParkingLot(lot);
        existing.setParkingSpot(spot);
        existing.setVehicle(vehicle);
        existing.setArrivalTime(arrival.minusHours(1));
        existing.setDepartureTime(departure);
        existing.setStatus(ReservationStatus.CONFIRMED);
        existing.setLockedUntil(arrival.minusHours(1).plusMinutes(30));
        existing.setBookingCode("ES-SPOT-TEST");
        reservationRepository.save(existing);

        spot.setStatus("reserved");
        parkingSpotRepository.save(spot);

        var body = new CreateReservationRequest(
            lot.getId(), vehicle.getId(),
            arrival.toString(), departure.toString(), spot.getId());

        mockMvc.perform(post("/api/reservations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body))
                .with(jwtWithRole("auth-sub-123", "DRIVER")))
            .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("POST /api/reservations - spot marked occupied - returns 409")
    void createReservation_spotOccupied_returns409() throws Exception {
        spot.setStatus("occupied");
        parkingSpotRepository.save(spot);

        OffsetDateTime arrival = now().plusHours(2);
        var body = new CreateReservationRequest(
            lot.getId(), vehicle.getId(),
            arrival.toString(), arrival.plusHours(2).toString(), spot.getId());

        mockMvc.perform(post("/api/reservations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body))
                .with(jwtWithRole("auth-sub-123", "DRIVER")))
            .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("POST /api/reservations - concurrent requests for same selected spot - only one succeeds")
    void createReservation_concurrentSameSpot_onlyOneSucceeds() throws Exception {
        User user2 = new User();
        user2.setAuthentikUserId("auth-sub-456");
        user2.setEmail("driver2@test.com");
        user2.setName("Test Driver 2");
        user2.setRole("DRIVER");
        user2 = userRepository.save(user2);

        Vehicle vehicle2 = new Vehicle();
        vehicle2.setUser(user2);
        vehicle2.setPlate("BB-11-BB");
        vehicle2.setMake("Renault");
        vehicle2.setModel("Clio");
        vehicle2.setYear(2021);
        vehicle2.setFuelType("Gasolina");
        vehicle2 = vehicleRepository.save(vehicle2);

        OffsetDateTime arrival = now().plusHours(2);
        OffsetDateTime departure = arrival.plusHours(2);

        CreateReservationRequest body1 = new CreateReservationRequest(
            lot.getId(), vehicle.getId(), arrival.toString(), departure.toString(), spot.getId()
        );
        CreateReservationRequest body2 = new CreateReservationRequest(
            lot.getId(), vehicle2.getId(), arrival.toString(), departure.toString(), spot.getId()
        );

        CountDownLatch startLatch = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<Integer> req1 = executor.submit(() -> {
                startLatch.await(5, TimeUnit.SECONDS);
                return mockMvc.perform(post("/api/reservations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body1))
                        .with(jwtWithRole("auth-sub-123", "DRIVER")))
                    .andReturn().getResponse().getStatus();
            });

            Future<Integer> req2 = executor.submit(() -> {
                startLatch.await(5, TimeUnit.SECONDS);
                return mockMvc.perform(post("/api/reservations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body2))
                        .with(jwtWithRole("auth-sub-456", "DRIVER")))
                    .andReturn().getResponse().getStatus();
            });

            startLatch.countDown();

            List<Integer> statuses = new ArrayList<>();
            statuses.add(req1.get(10, TimeUnit.SECONDS));
            statuses.add(req2.get(10, TimeUnit.SECONDS));

            long createdCount = statuses.stream().filter(s -> s == 201).count();
            long conflictCount = statuses.stream().filter(s -> s == 409).count();
            assertEquals(1, createdCount, "Exactly one request should create reservation");
            assertEquals(1, conflictCount, "Exactly one request should fail with conflict");

            List<Reservation> spotReservations = reservationRepository.findAll().stream()
                .filter(r -> r.getParkingSpot() != null && r.getParkingSpot().getId().equals(spot.getId()))
                .toList();
            assertEquals(1, spotReservations.size(), "There should be only one reservation for the spot");
        } finally {
            executor.shutdownNow();
            assertTrue(executor.awaitTermination(2, TimeUnit.SECONDS) || executor.isTerminated());
        }
    }

    @Test
    @DisplayName("POST /api/reservations - concurrent auto-assignment when only one free spot - only one succeeds")
    void createReservation_concurrentAutoAssignSingleFreeSpot_onlyOneSucceeds() throws Exception {
        User user2 = new User();
        user2.setAuthentikUserId("auth-sub-789");
        user2.setEmail("driver3@test.com");
        user2.setName("Test Driver 3");
        user2.setRole("DRIVER");
        user2 = userRepository.save(user2);

        Vehicle vehicle2 = new Vehicle();
        vehicle2.setUser(user2);
        vehicle2.setPlate("CC-22-CC");
        vehicle2.setMake("Peugeot");
        vehicle2.setModel("208");
        vehicle2.setYear(2022);
        vehicle2.setFuelType("Gasolina");
        vehicle2 = vehicleRepository.save(vehicle2);

        // Force only one logical free slot for the requested window.
        lot.setTotalSpaces(1);
        parkingLotRepository.save(lot);

        OffsetDateTime arrival = now().plusHours(2);
        OffsetDateTime departure = arrival.plusHours(2);

        CreateReservationRequest body1 = new CreateReservationRequest(
            lot.getId(), vehicle.getId(), arrival.toString(), departure.toString(), null
        );
        CreateReservationRequest body2 = new CreateReservationRequest(
            lot.getId(), vehicle2.getId(), arrival.toString(), departure.toString(), null
        );

        CountDownLatch startLatch = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<Integer> req1 = executor.submit(() -> {
                startLatch.await(5, TimeUnit.SECONDS);
                return mockMvc.perform(post("/api/reservations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body1))
                        .with(jwtWithRole("auth-sub-123", "DRIVER")))
                    .andReturn().getResponse().getStatus();
            });

            Future<Integer> req2 = executor.submit(() -> {
                startLatch.await(5, TimeUnit.SECONDS);
                return mockMvc.perform(post("/api/reservations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body2))
                        .with(jwtWithRole("auth-sub-789", "DRIVER")))
                    .andReturn().getResponse().getStatus();
            });

            startLatch.countDown();

            List<Integer> statuses = new ArrayList<>();
            statuses.add(req1.get(10, TimeUnit.SECONDS));
            statuses.add(req2.get(10, TimeUnit.SECONDS));

            long createdCount = statuses.stream().filter(s -> s == 201).count();
            long conflictCount = statuses.stream().filter(s -> s == 409).count();
            assertEquals(1, createdCount, "Exactly one request should create reservation");
            assertEquals(1, conflictCount, "Exactly one request should fail with conflict");

            List<Reservation> lotReservations = reservationRepository.findAll().stream()
                .filter(r -> r.getParkingLot() != null && r.getParkingLot().getId().equals(lot.getId()))
                .toList();
            assertEquals(1, lotReservations.size(), "There should be only one active reservation created");
            assertTrue(lotReservations.getFirst().getParkingSpot() != null, "Auto-assignment must choose a concrete spot");
        } finally {
            executor.shutdownNow();
            assertTrue(executor.awaitTermination(2, TimeUnit.SECONDS) || executor.isTerminated());
        }
    }

    @Test
    @DisplayName("GET /api/reservations - driver sees own reservations")
    void listReservations_driverSeesOwnReservations() throws Exception {
        Reservation reservation = seedReservation(now().plusHours(3), now().plusHours(5), ReservationStatus.CONFIRMED);

        mockMvc.perform(get("/api/reservations")
                .with(jwtWithRole("auth-sub-123", "DRIVER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$[0].reservationId").value(reservation.getId().toString()))
            .andExpect(jsonPath("$[0].bookingCode").value(reservation.getBookingCode()));
    }

    @Test
    @DisplayName("GET /api/reservations/{id} - owned reservation - returns 200")
    void getReservation_ownedReservation_returns200() throws Exception {
        Reservation reservation = seedReservation(now().plusHours(3), now().plusHours(5), ReservationStatus.CONFIRMED);

        mockMvc.perform(get("/api/reservations/{reservationId}", reservation.getId())
                .with(jwtWithRole("auth-sub-123", "DRIVER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.reservationId").value(reservation.getId().toString()))
            .andExpect(jsonPath("$.status").value("CONFIRMED"));
    }

    @Test
    @DisplayName("GET /api/reservations/{id} - foreign reservation - returns 404")
    void getReservation_foreignReservation_returns404() throws Exception {
        User otherUser = new User();
        otherUser.setAuthentikUserId("auth-sub-999");
        otherUser.setEmail("driver9@test.com");
        otherUser.setName("Other Driver");
        otherUser.setRole("DRIVER");
        otherUser = userRepository.save(otherUser);

        Reservation reservation = new Reservation();
        reservation.setUser(otherUser);
        reservation.setParkingLot(lot);
        reservation.setParkingSpot(spot);
        reservation.setVehicle(vehicle);
        reservation.setArrivalTime(now().plusHours(3));
        reservation.setDepartureTime(now().plusHours(5));
        reservation.setStatus(ReservationStatus.CONFIRMED);
        reservation.setLockedUntil(reservation.getArrivalTime().plusMinutes(30));
        reservation.setEstimatedCost(new BigDecimal("3.00"));
        reservation.setBookingCode("ES-FOREIGN-1");
        reservationRepository.save(reservation);

        mockMvc.perform(get("/api/reservations/{reservationId}", reservation.getId())
                .with(jwtWithRole("auth-sub-123", "DRIVER")))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("PUT /api/reservations/{id} - future reservation - updates successfully")
    void updateReservation_futureReservation_returns200() throws Exception {
        Reservation reservation = seedReservation(now().plusHours(3), now().plusHours(5), ReservationStatus.CONFIRMED);
        ParkingSpot secondSpot = new ParkingSpot();
        secondSpot.setParkingLot(lot);
        secondSpot.setSpotNumber("A02");
        secondSpot.setZone(ZoneType.STANDARD);
        secondSpot.setSpotRow(1);
        secondSpot.setSpotCol(2);
        secondSpot.setStatus("free");
        secondSpot = parkingSpotRepository.save(secondSpot);

        UpdateReservationRequest body = new UpdateReservationRequest(
            lot.getId(),
            vehicle.getId(),
            now().plusHours(6).toString(),
            now().plusHours(8).toString(),
            secondSpot.getId()
        );

        mockMvc.perform(put("/api/reservations/{reservationId}", reservation.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body))
                .with(jwtWithRole("auth-sub-123", "DRIVER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.reservationId").value(reservation.getId().toString()))
            .andExpect(jsonPath("$.spotId").value(secondSpot.getId().toString()))
            .andExpect(jsonPath("$.status").value("CONFIRMED"));
    }

    @Test
    @DisplayName("PUT /api/reservations/{id} - reservation already started - returns 409")
    void updateReservation_startedReservation_returns409() throws Exception {
        Reservation reservation = seedReservation(now().minusMinutes(5), now().plusHours(1), ReservationStatus.CONFIRMED);

        UpdateReservationRequest body = new UpdateReservationRequest(
            lot.getId(),
            vehicle.getId(),
            now().plusHours(3).toString(),
            now().plusHours(4).toString(),
            null
        );

        mockMvc.perform(put("/api/reservations/{reservationId}", reservation.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body))
                .with(jwtWithRole("auth-sub-123", "DRIVER")))
            .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("DELETE /api/reservations/{id} - future reservation - cancels successfully")
    void cancelReservation_futureReservation_returns200() throws Exception {
        Reservation reservation = seedReservation(now().plusHours(3), now().plusHours(5), ReservationStatus.CONFIRMED);

        mockMvc.perform(delete("/api/reservations/{reservationId}", reservation.getId())
                .with(jwtWithRole("auth-sub-123", "DRIVER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.reservationId").value(reservation.getId().toString()))
            .andExpect(jsonPath("$.status").value("CANCELLED"))
            .andExpect(jsonPath("$.lockedUntil").value(nullValue()));
    }

    @Test
    @DisplayName("DELETE /api/reservations/{id} - already cancelled - returns 409")
    void cancelReservation_alreadyCancelled_returns409() throws Exception {
        Reservation reservation = seedReservation(now().plusHours(3), now().plusHours(5), ReservationStatus.CANCELLED);

        mockMvc.perform(delete("/api/reservations/{reservationId}", reservation.getId())
                .with(jwtWithRole("auth-sub-123", "DRIVER")))
            .andExpect(status().isConflict());
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private OffsetDateTime now() {
        return OffsetDateTime.now(ZoneOffset.UTC);
    }

    private CreateReservationRequest validRequest() {
        OffsetDateTime arrival = now().plusHours(2);
        return new CreateReservationRequest(
            lot.getId(), vehicle.getId(),
            arrival.toString(), arrival.plusHours(2).toString(), null);
    }

    private Reservation seedReservation(OffsetDateTime arrival, OffsetDateTime departure, ReservationStatus status) {
        Reservation reservation = new Reservation();
        reservation.setUser(user);
        reservation.setParkingLot(lot);
        reservation.setParkingSpot(spot);
        reservation.setVehicle(vehicle);
        reservation.setArrivalTime(arrival);
        reservation.setDepartureTime(departure);
        reservation.setStatus(status);
        reservation.setLockedUntil(status == ReservationStatus.CONFIRMED ? arrival.plusMinutes(30) : null);
        reservation.setEstimatedCost(new BigDecimal("3.00"));
        reservation.setBookingCode("ES-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        return reservationRepository.save(reservation);
    }
}
