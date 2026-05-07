package pt.ua.deti.apieasyspot.occupancy.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import pt.ua.deti.apieasyspot.TestcontainersConfiguration;
import pt.ua.deti.apieasyspot.occupancy.dto.UpdateTariffRequest;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.model.Tariff;
import pt.ua.deti.apieasyspot.occupancy.model.TariffStatus;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.TariffAuditRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.TariffRepository;
import pt.ua.deti.apieasyspot.billing.model.ParkingSession;
import pt.ua.deti.apieasyspot.billing.repository.TimescaleParkingSessionRepository;
import pt.ua.deti.apieasyspot.occupancy.model.ZoneType;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static pt.ua.deti.apieasyspot.support.TestJwtRequests.jwtWithRole;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class ManagerTariffControllerIT {

    @Autowired WebApplicationContext wac;
    @Autowired ObjectMapper objectMapper;
    @Autowired ParkingLotRepository parkingLotRepository;
    @Autowired TariffRepository tariffRepository;
    @Autowired TariffAuditRepository tariffAuditRepository;
    @Autowired private TimescaleParkingSessionRepository parkingSessionRepository;

    @MockitoBean JwtDecoder jwtDecoder;

    MockMvc mockMvc;
    ParkingLot lot;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();
        parkingSessionRepository.deleteAll();
        tariffAuditRepository.deleteAll();
        tariffRepository.deleteAll();
        parkingLotRepository.deleteAll();

        lot = new ParkingLot();
        lot.setName("Central Park");
        lot.setCity("Aveiro");
        lot.setAddress("Rua Central 123");
        lot.setLatitude(40.6412);
        lot.setLongitude(-8.6536);
        lot.setTotalSpaces(100);
        lot = parkingLotRepository.save(lot);
    }

    @Test
    @DisplayName("GET /api/manager/tariffs - list all tariffs")
    void listTariffs_Success() throws Exception {
        Tariff tariff = new Tariff();
        tariff.setParkingLot(lot);
        tariff.setName("Standard");
        tariff.setPricePerHour(new BigDecimal("1.20"));
        tariff.setStatus(TariffStatus.ACTIVE);
        tariffRepository.save(tariff);

        mockMvc.perform(get("/api/manager/tariffs")
                .with(jwtWithRole("mgr-1", "MANAGER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$[0].parkName", is("Central Park")))
            .andExpect(jsonPath("$[0].pricePerHour", is(1.2)));
    }

    @Test
    @DisplayName("GET /api/manager/tariffs - filter by city")
    void listTariffs_FilterCity() throws Exception {
        Tariff tariff = new Tariff();
        tariff.setParkingLot(lot);
        tariff.setName("Standard");
        tariff.setPricePerHour(new BigDecimal("1.20"));
        tariff.setStatus(TariffStatus.ACTIVE);
        tariffRepository.save(tariff);

        mockMvc.perform(get("/api/manager/tariffs")
                .param("city", "Aveiro")
                .with(jwtWithRole("mgr-1", "MANAGER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)));

        mockMvc.perform(get("/api/manager/tariffs")
                .param("city", "Lisboa")
                .with(jwtWithRole("mgr-1", "MANAGER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @DisplayName("PUT /api/manager/tariffs - update existing tariff and create audit")
    void updateTariff_Success() throws Exception {
        Tariff tariff = new Tariff();
        tariff.setParkingLot(lot);
        tariff.setName("Standard");
        tariff.setPricePerHour(new BigDecimal("1.20"));
        tariff.setStatus(TariffStatus.ACTIVE);
        tariffRepository.save(tariff);

        UpdateTariffRequest request = new UpdateTariffRequest(
            lot.getId(),
            new BigDecimal("2.50"),
            new BigDecimal("20.00"),
            new BigDecimal("150.00"),
            new BigDecimal("0.35"),
            TariffStatus.INACTIVE
        );

        mockMvc.perform(put("/api/manager/tariffs")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(jwtWithRole("mgr-1", "MANAGER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.pricePerHour", is(2.5)))
            .andExpect(jsonPath("$.status", is("INACTIVE")));

        // Verify DB
        Tariff updated = tariffRepository.findByParkingLotId(lot.getId()).get(0);
        assertEquals(new BigDecimal("2.50"), updated.getPricePerHour());
        assertEquals(TariffStatus.INACTIVE, updated.getStatus());

        // Verify Audit
        assertEquals(1, tariffAuditRepository.count());
    }

    @Test
    @DisplayName("PUT /api/manager/tariffs - non-existent park returns 404")
    void updateTariff_NotFound() throws Exception {
        UpdateTariffRequest request = new UpdateTariffRequest(
            UUID.randomUUID(),
            new BigDecimal("2.50"),
            new BigDecimal("20.00"),
            new BigDecimal("150.00"),
            new BigDecimal("0.35"),
            TariffStatus.ACTIVE
        );

        mockMvc.perform(put("/api/manager/tariffs")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(jwtWithRole("mgr-1", "MANAGER")))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("PUT /api/manager/tariffs - invalid validation returns 400")
    void updateTariff_Invalid() throws Exception {
        UpdateTariffRequest request = new UpdateTariffRequest(
            lot.getId(),
            new BigDecimal("-1.00"), // Invalid
            new BigDecimal("20.00"),
            new BigDecimal("150.00"),
            new BigDecimal("0.35"),
            TariffStatus.ACTIVE
        );

        mockMvc.perform(put("/api/manager/tariffs")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(jwtWithRole("mgr-1", "MANAGER")))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("GET /api/manager/tariffs - filter by status")
    void listTariffs_FilterStatus() throws Exception {
        Tariff activeTariff = new Tariff();
        activeTariff.setParkingLot(lot);
        activeTariff.setName("Active");
        activeTariff.setPricePerHour(new BigDecimal("1.20"));
        activeTariff.setStatus(TariffStatus.ACTIVE);
        tariffRepository.save(activeTariff);

        ParkingLot lot2 = new ParkingLot();
        lot2.setName("Another Park");
        lot2.setCity("Lisbon");
        lot2.setAddress("Rua 456");
        lot2.setLatitude(38.7223);
        lot2.setLongitude(-9.1393);
        lot2.setTotalSpaces(50);
        lot2 = parkingLotRepository.save(lot2);

        Tariff inactiveTariff = new Tariff();
        inactiveTariff.setParkingLot(lot2);
        inactiveTariff.setName("Inactive");
        inactiveTariff.setPricePerHour(new BigDecimal("2.00"));
        inactiveTariff.setStatus(TariffStatus.INACTIVE);
        tariffRepository.save(inactiveTariff);

        mockMvc.perform(get("/api/manager/tariffs")
                .param("status", "ACTIVE")
                .with(jwtWithRole("mgr-1", "MANAGER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$[0].status", is("ACTIVE")));

        mockMvc.perform(get("/api/manager/tariffs")
                .param("status", "INACTIVE")
                .with(jwtWithRole("mgr-1", "MANAGER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$[0].status", is("INACTIVE")));
    }

    @Test
    @DisplayName("PUT /api/manager/tariffs - null required field returns 400")
    void updateTariff_NullField() throws Exception {
        mockMvc.perform(put("/api/manager/tariffs")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"parkId\": null, \"pricePerHour\": 1.0, \"maxDaily\": 20.0, \"monthlyPrice\": 100.0, \"pricePerKwh\": 0.5, \"status\": \"ACTIVE\"}")
                .with(jwtWithRole("mgr-1", "MANAGER")))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("PUT /api/manager/tariffs - price with too many decimals returns 400")
    void updateTariff_TooManyDecimals() throws Exception {
        UpdateTariffRequest request = new UpdateTariffRequest(
            lot.getId(),
            new BigDecimal("1.505"), // 3 decimal places - invalid
            new BigDecimal("20.00"),
            new BigDecimal("150.00"),
            new BigDecimal("0.35"),
            TariffStatus.ACTIVE
        );

        mockMvc.perform(put("/api/manager/tariffs")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(jwtWithRole("mgr-1", "MANAGER")))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("PUT /api/manager/tariffs - zero prices allowed")
    void updateTariff_ZeroPrices() throws Exception {
        UpdateTariffRequest request = new UpdateTariffRequest(
            lot.getId(),
            new BigDecimal("0.00"),
            new BigDecimal("0.00"),
            new BigDecimal("0.00"),
            new BigDecimal("0.00"),
            TariffStatus.INACTIVE
        );

        mockMvc.perform(put("/api/manager/tariffs")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(jwtWithRole("mgr-1", "MANAGER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.pricePerHour", is(0.0)))
            .andExpect(jsonPath("$.status", is("INACTIVE")));
    }

    @Test
    @DisplayName("GET /api/manager/tariffs - no results with non-matching filters")
    void listTariffs_EmptyResult() throws Exception {
        mockMvc.perform(get("/api/manager/tariffs")
                .param("city", "NonexistentCity")
                .with(jwtWithRole("mgr-1", "MANAGER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @DisplayName("GET /api/manager/tariffs - missing authentication returns 401")
    void listTariffs_NoAuth() throws Exception {
        mockMvc.perform(get("/api/manager/tariffs"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/manager/tariffs - wrong role returns 403")
    void listTariffs_WrongRole() throws Exception {
        mockMvc.perform(get("/api/manager/tariffs")
                .with(jwtWithRole("driver-1", "DRIVER")))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("PUT /api/manager/tariffs - missing authentication returns 401")
    void updateTariff_NoAuth() throws Exception {
        UpdateTariffRequest request = new UpdateTariffRequest(
            lot.getId(),
            new BigDecimal("1.50"),
            new BigDecimal("15.00"),
            new BigDecimal("100.00"),
            new BigDecimal("0.25"),
            TariffStatus.ACTIVE
        );

        mockMvc.perform(put("/api/manager/tariffs")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("PUT /api/manager/tariffs - wrong role returns 403")
    void updateTariff_WrongRole() throws Exception {
        UpdateTariffRequest request = new UpdateTariffRequest(
            lot.getId(),
            new BigDecimal("1.50"),
            new BigDecimal("15.00"),
            new BigDecimal("100.00"),
            new BigDecimal("0.25"),
            TariffStatus.ACTIVE
        );

        mockMvc.perform(put("/api/manager/tariffs")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(jwtWithRole("driver-1", "DRIVER")))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("PUT /api/manager/tariffs - 409 Conflict when active parking sessions exist")
    void updateTariff_ActiveSessions_Conflict() throws Exception {
        // Create active parking session
        ParkingSession session = new ParkingSession();
        session.setParkingLotId(lot.getId());
        session.setZoneType(ZoneType.STANDARD);
        session.setEntryTime(OffsetDateTime.now().minusHours(1));
        session.setExitTime(OffsetDateTime.now().plusHours(2)); // Still active
        parkingSessionRepository.save(session);

        UpdateTariffRequest request = new UpdateTariffRequest(
            lot.getId(),
            new BigDecimal("2.50"),
            new BigDecimal("20.00"),
            new BigDecimal("150.00"),
            new BigDecimal("0.35"),
            TariffStatus.ACTIVE
        );

        mockMvc.perform(put("/api/manager/tariffs")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(jwtWithRole("mgr-1", "MANAGER")))
            .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("PUT /api/manager/tariffs - 200 Success when no active sessions")
    void updateTariff_NoActiveSessions_Success() throws Exception {
        // Create expired parking session (should not block)
        ParkingSession expiredSession = new ParkingSession();
        expiredSession.setParkingLotId(lot.getId());
        expiredSession.setZoneType(ZoneType.STANDARD);
        expiredSession.setEntryTime(OffsetDateTime.now().minusHours(3));
        expiredSession.setExitTime(OffsetDateTime.now().minusHours(1)); // Already ended
        parkingSessionRepository.save(expiredSession);

        UpdateTariffRequest request = new UpdateTariffRequest(
            lot.getId(),
            new BigDecimal("2.50"),
            new BigDecimal("20.00"),
            new BigDecimal("150.00"),
            new BigDecimal("0.35"),
            TariffStatus.ACTIVE
        );

        mockMvc.perform(put("/api/manager/tariffs")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(jwtWithRole("mgr-1", "MANAGER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.pricePerHour", is(2.5)));
    }

    @Test
    @DisplayName("GET /api/manager/tariffs - filter by multiple criteria (city + status)")
    void listTariffs_FilterByCityAndStatus() throws Exception {
        Tariff activeTariff = new Tariff();
        activeTariff.setParkingLot(lot);
        activeTariff.setName("Active");
        activeTariff.setPricePerHour(new BigDecimal("1.20"));
        activeTariff.setStatus(TariffStatus.ACTIVE);
        tariffRepository.save(activeTariff);

        ParkingLot lisboaPark = new ParkingLot();
        lisboaPark.setName("Lisboa Park");
        lisboaPark.setCity("Lisboa");
        lisboaPark.setAddress("Rua 456");
        lisboaPark.setLatitude(38.7223);
        lisboaPark.setLongitude(-9.1393);
        lisboaPark.setTotalSpaces(50);
        lisboaPark = parkingLotRepository.save(lisboaPark);

        Tariff lisboaTariff = new Tariff();
        lisboaTariff.setParkingLot(lisboaPark);
        lisboaTariff.setName("Lisboa Tariff");
        lisboaTariff.setPricePerHour(new BigDecimal("2.00"));
        lisboaTariff.setStatus(TariffStatus.ACTIVE);
        tariffRepository.save(lisboaTariff);

        mockMvc.perform(get("/api/manager/tariffs")
                .param("city", "Aveiro")
                .param("status", "ACTIVE")
                .with(jwtWithRole("mgr-1", "MANAGER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$[0].city", is("Aveiro")))
            .andExpect(jsonPath("$[0].status", is("ACTIVE")));
    }

    @Test
    @DisplayName("PUT /api/manager/tariffs - verify audit trail creation")
    void updateTariff_VerifyAuditTrail() throws Exception {
        Tariff tariff = new Tariff();
        tariff.setParkingLot(lot);
        tariff.setName("Standard");
        tariff.setPricePerHour(new BigDecimal("1.00"));
        tariff.setStatus(TariffStatus.ACTIVE);
        tariff = tariffRepository.save(tariff);

        long initialAuditCount = tariffAuditRepository.count();

        UpdateTariffRequest request = new UpdateTariffRequest(
            lot.getId(),
            new BigDecimal("2.50"),
            new BigDecimal("20.00"),
            new BigDecimal("150.00"),
            new BigDecimal("0.35"),
            TariffStatus.ACTIVE
        );

        mockMvc.perform(put("/api/manager/tariffs")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(jwtWithRole("mgr-1", "MANAGER")))
            .andExpect(status().isOk());

        assertEquals(initialAuditCount + 1, tariffAuditRepository.count());
    }
}
