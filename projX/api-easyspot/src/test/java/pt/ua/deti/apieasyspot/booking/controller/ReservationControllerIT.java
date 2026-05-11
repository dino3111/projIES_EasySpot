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
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.billing.service.BillingService;
import pt.ua.deti.apieasyspot.booking.dto.CreateReservationRequest;
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
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static pt.ua.deti.apieasyspot.support.TestJwtRequests.jwtWithRole;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
}
