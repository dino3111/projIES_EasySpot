package pt.ua.deti.apieasyspot.billing.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.billing.model.ParkingSession;
import pt.ua.deti.apieasyspot.billing.repository.TimescaleParkingSessionRepository;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.model.ZoneType;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;
import pt.ua.deti.apieasyspot.vehicle.model.Vehicle;
import pt.ua.deti.apieasyspot.vehicle.repository.VehicleRepository;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static pt.ua.deti.apieasyspot.support.TestJwtRequests.jwtWithRole;

@SpringBootTest
class DriverSpendingControllerIT {

    @Autowired private WebApplicationContext wac;
    @Autowired private UserRepository userRepository;
    @Autowired private VehicleRepository vehicleRepository;
    @Autowired private ParkingLotRepository parkingLotRepository;
    @Autowired private TimescaleParkingSessionRepository parkingSessionRepository;
    @MockitoBean private JwtDecoder jwtDecoder;

    private MockMvc mockMvc;
    private User driver;
    private Vehicle vehicleA;
    private Vehicle vehicleB;
    private ParkingLot lot;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();

        parkingSessionRepository.deleteAll();
        vehicleRepository.deleteAll();
        userRepository.deleteAll();
        parkingLotRepository.deleteAll();

        driver = new User();
        driver.setAuthentikUserId("driver-e2e-001");
        driver.setEmail("driver-e2e@test.com");
        driver.setName("Driver E2E");
        driver.setRole("DRIVER");
        driver = userRepository.save(driver);

        vehicleA = new Vehicle();
        vehicleA.setUser(driver);
        vehicleA.setPlate("AA-00-AA");
        vehicleA.setMake("Opel");
        vehicleA.setModel("Corsa");
        vehicleA.setFuelType("Gasolina");
        vehicleA.setYear(2021);
        vehicleA = vehicleRepository.save(vehicleA);

        vehicleB = new Vehicle();
        vehicleB.setUser(driver);
        vehicleB.setPlate("BB-00-BB");
        vehicleB.setMake("Renault");
        vehicleB.setModel("Zoe");
        vehicleB.setFuelType("Elétrico");
        vehicleB.setYear(2022);
        vehicleB.setEv(true);
        vehicleB = vehicleRepository.save(vehicleB);

        lot = new ParkingLot();
        lot.setName("Fórum Aveiro");
        lot.setCity("Aveiro");
        lot.setAddress("Rua X");
        lot.setLatitude(40.64);
        lot.setLongitude(-8.65);
        lot.setTotalSpaces(200);
        lot = parkingLotRepository.save(lot);
    }

    @Test
    @DisplayName("E2E multi-vehicle scenario returns totals and breakdowns")
    void spending_multiVehicleScenario_returnsAggregates() throws Exception {
        OffsetDateTime now = OffsetDateTime.now();
        parkingSessionRepository.save(session(vehicleA, ZoneType.STANDARD, now.minusDays(2), 60, "5.00"));
        parkingSessionRepository.save(session(vehicleB, ZoneType.EV, now.minusDays(1), 80, "8.50"));

        mockMvc.perform(get("/api/driver/costs/spending")
                .with(jwtWithRole("driver-e2e-001", "DRIVER"))
                .param("timeWindow", "30D"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totals.totalSpent").value(13.50))
            .andExpect(jsonPath("$.totals.chargingSpent").value(8.50))
            .andExpect(jsonPath("$.breakdownByVehicle.length()").value(2))
            .andExpect(jsonPath("$.insights.costliestSession.totalSpent").value(8.50))
            .andExpect(jsonPath("$.historyTotal").value(2));
    }

    @Test
    @DisplayName("E2E empty history returns zero totals and empty lists")
    void spending_emptyHistoryScenario_returnsEmptyPayload() throws Exception {
        mockMvc.perform(get("/api/driver/costs/spending")
                .with(jwtWithRole("driver-e2e-001", "DRIVER"))
                .param("timeWindow", "7D"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totals.totalSpent").value(0.00))
            .andExpect(jsonPath("$.timeseries.length()").value(0))
            .andExpect(jsonPath("$.history.length()").value(0))
            .andExpect(jsonPath("$.historyTotal").value(0));
    }

    @Test
    @DisplayName("historyPage and historySize - pagination returns correct page slice")
    void spending_pagination_returnsCorrectSlice() throws Exception {
        OffsetDateTime now = OffsetDateTime.now();
        for (int i = 0; i < 15; i++) {
            parkingSessionRepository.save(session(vehicleA, ZoneType.STANDARD, now.minusHours(i + 1), 30, "1.00"));
        }

        mockMvc.perform(get("/api/driver/costs/spending")
                .with(jwtWithRole("driver-e2e-001", "DRIVER"))
                .param("timeWindow", "30D")
                .param("historyPage", "0")
                .param("historySize", "10"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.history.length()").value(10))
            .andExpect(jsonPath("$.historyTotal").value(15));

        mockMvc.perform(get("/api/driver/costs/spending")
                .with(jwtWithRole("driver-e2e-001", "DRIVER"))
                .param("timeWindow", "30D")
                .param("historyPage", "1")
                .param("historySize", "10"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.history.length()").value(5))
            .andExpect(jsonPath("$.historyTotal").value(15));
    }

    @Test
    @DisplayName("invalid ranges and unknown vehicleId are handled")
    void spending_invalidInputs_areHandled() throws Exception {
        mockMvc.perform(get("/api/driver/costs/spending")
                .with(jwtWithRole("driver-e2e-001", "DRIVER"))
                .param("from", "2026-04-20")
                .param("to", "2026-04-01"))
            .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/driver/costs/spending")
                .with(jwtWithRole("driver-e2e-001", "DRIVER"))
                .param("vehicleId", "11111111-1111-1111-1111-111111111111"))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("wrong role cannot access endpoint")
    void spending_wrongRole_forbidden() throws Exception {
        mockMvc.perform(get("/api/driver/costs/spending")
                .with(jwtWithRole("driver-e2e-001", "MANAGER")))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("very large dataset still returns aggregated response")
    void spending_largeDataset_returnsAggregatedResponse() throws Exception {
        OffsetDateTime now = OffsetDateTime.now();
        List<ParkingSession> bulk = new ArrayList<>();
        for (int i = 0; i < 1500; i++) {
            Vehicle chosen = (i % 2 == 0) ? vehicleA : vehicleB;
            ZoneType zone = (i % 5 == 0) ? ZoneType.EV : ZoneType.STANDARD;
            bulk.add(session(chosen, zone, now.minusHours(i), 45 + (i % 90), "2.50"));
        }
        parkingSessionRepository.saveAll(bulk);

        mockMvc.perform(get("/api/driver/costs/spending")
                .with(jwtWithRole("driver-e2e-001", "DRIVER"))
                .param("timeWindow", "12M"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totals.totalSpent").value(3750.00))
            .andExpect(jsonPath("$.breakdownByVehicle.length()").value(2))
            .andExpect(jsonPath("$.timeseries.length()").isNumber());
    }

    private ParkingSession session(Vehicle vehicle, ZoneType zoneType, OffsetDateTime entry, long durationMinutes, String amount) {
        ParkingSession s = new ParkingSession();
        s.setUserId(driver.getId());
        s.setVehicleId(vehicle.getId());
        s.setParkingLotId(lot.getId());
        s.setZoneType(zoneType);
        s.setEntryTime(entry);
        s.setExitTime(entry.plusMinutes(durationMinutes));
        s.setRevenueEuros(new BigDecimal(amount));
        return s;
    }
}
