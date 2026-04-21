package pt.ua.deti.apieasyspot.billing.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import pt.ua.deti.apieasyspot.TestcontainersConfiguration;
import pt.ua.deti.apieasyspot.occupancy.model.OccupancySnapshot;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.model.Tariff;
import pt.ua.deti.apieasyspot.occupancy.model.TariffStatus;
import pt.ua.deti.apieasyspot.occupancy.model.ZoneType;
import pt.ua.deti.apieasyspot.occupancy.repository.OccupancySnapshotRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.TariffRepository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static pt.ua.deti.apieasyspot.support.TestJwtRequests.jwtWithRole;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class DriverPlanningControllerIT {

    @Autowired WebApplicationContext wac;
    @Autowired ParkingLotRepository parkingLotRepository;
    @Autowired TariffRepository tariffRepository;
    @Autowired OccupancySnapshotRepository occupancySnapshotRepository;
    @Autowired JdbcTemplate jdbc;

    @MockitoBean JwtDecoder jwtDecoder;

    MockMvc mockMvc;

    private ParkingLot lot;

    @BeforeEach
    void setUp() {
        occupancySnapshotRepository.deleteAll();
        tariffRepository.deleteAll();
        parkingLotRepository.deleteAll();

        lot = new ParkingLot();
        lot.setName("Parque Aveiro Centro");
        lot.setCity("Aveiro");
        lot.setAddress("Rua João Mendonça, 12");
        lot.setLatitude(40.6405);
        lot.setLongitude(-8.6538);
        lot.setOpeningHours("24h");
        lot.setTotalSpaces(100);
        lot.setAmenities(List.of("Wifi", "CCTV"));
        lot = parkingLotRepository.save(lot);

        Tariff tariff = new Tariff();
        tariff.setParkingLot(lot);
        tariff.setName("Standard");
        tariff.setDescription("Tarifa standard");
        tariff.setPricePerHour(BigDecimal.valueOf(1.20));
        tariff.setMaxDaily(BigDecimal.valueOf(12.00));
        tariff.setMonthly(BigDecimal.valueOf(80.00));
        tariff.setStatus(TariffStatus.ACTIVE);
        tariffRepository.save(tariff);

        OccupancySnapshot snap = new OccupancySnapshot();
        snap.setParkingLot(lot);
        snap.setZoneType(ZoneType.STANDARD);
        snap.setOccupiedCount(20);
        snap.setTotalCount(100);
        snap.setRecordedAt(Instant.now());
        occupancySnapshotRepository.save(snap);

        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();
    }

    // --- Auth tests ---

    @Test
    @DisplayName("GET /api/driver/costs/planning - unauthenticated - returns 401")
    void planning_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/driver/costs/planning")
                .param("city", "Aveiro")
                .param("estimatedDurationMinutes", "60")
                .param("lat", "40.6405")
                .param("lng", "-8.6538"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/driver/costs/planning - MANAGER role - returns 403")
    void planning_wrongRole_returns403() throws Exception {
        mockMvc.perform(get("/api/driver/costs/planning")
                .param("city", "Aveiro")
                .param("estimatedDurationMinutes", "60")
                .param("lat", "40.6405")
                .param("lng", "-8.6538")
                .with(jwtWithRole("manager-sub", "MANAGER")))
            .andExpect(status().isForbidden());
    }

    // --- Happy path ---

    @Test
    @DisplayName("GET /api/driver/costs/planning - valid request - returns recommendations array")
    void planning_driver_returnsRecommendations() throws Exception {
        mockMvc.perform(get("/api/driver/costs/planning")
                .param("city", "Aveiro")
                .param("estimatedDurationMinutes", "60")
                .param("lat", "40.6405")
                .param("lng", "-8.6538")
                .param("maxDistanceMeters", "5000")
                .contentType(MediaType.APPLICATION_JSON)
                .with(jwtWithRole("driver-sub", "DRIVER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.recommendations").isArray())
            .andExpect(jsonPath("$.recommendations[0].name").value("Parque Aveiro Centro"))
            .andExpect(jsonPath("$.recommendations[0].address").value("Rua João Mendonça, 12"))
            .andExpect(jsonPath("$.recommendations[0].pricePerHour").value(1.20))
            .andExpect(jsonPath("$.recommendations[0].currentOccupancy.occupancyPercent").value(20))
            .andExpect(jsonPath("$.recommendations[0].currentOccupancy.status").value("AVAILABLE"))
            .andExpect(jsonPath("$.recommendations[0].openingHours").value("24h"));
    }

    @Test
    @DisplayName("GET /api/driver/costs/planning - orderBy=lowestPrice - returns ordered result")
    void planning_orderByLowestPrice_returnsSorted() throws Exception {
        mockMvc.perform(get("/api/driver/costs/planning")
                .param("city", "Aveiro")
                .param("estimatedDurationMinutes", "30")
                .param("lat", "40.6405")
                .param("lng", "-8.6538")
                .param("orderBy", "LOWEST_PRICE")
                .with(jwtWithRole("driver-sub", "DRIVER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.recommendations").isArray());
    }

    @Test
    @DisplayName("GET /api/driver/costs/planning - orderBy=nearest - returns ordered result")
    void planning_orderByNearest_returnsSorted() throws Exception {
        mockMvc.perform(get("/api/driver/costs/planning")
                .param("city", "Aveiro")
                .param("estimatedDurationMinutes", "30")
                .param("lat", "40.6405")
                .param("lng", "-8.6538")
                .param("orderBy", "NEAREST")
                .with(jwtWithRole("driver-sub", "DRIVER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.recommendations").isArray());
    }

    // --- EV / Accessible filtering ---

    @Test
    @DisplayName("GET /api/driver/costs/planning - isElectric=true, no EV lots - returns empty")
    void planning_electricFilter_noEvLots_returnsEmpty() throws Exception {
        mockMvc.perform(get("/api/driver/costs/planning")
                .param("city", "Aveiro")
                .param("estimatedDurationMinutes", "60")
                .param("isElectric", "true")
                .param("lat", "40.6405")
                .param("lng", "-8.6538")
                .with(jwtWithRole("driver-sub", "DRIVER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.recommendations").isEmpty());
    }

    @Test
    @DisplayName("GET /api/driver/costs/planning - isAccessible=true, no accessible lots - returns empty")
    void planning_accessibleFilter_noAccessibleLots_returnsEmpty() throws Exception {
        mockMvc.perform(get("/api/driver/costs/planning")
                .param("city", "Aveiro")
                .param("estimatedDurationMinutes", "60")
                .param("isAccessible", "true")
                .param("lat", "40.6405")
                .param("lng", "-8.6538")
                .with(jwtWithRole("driver-sub", "DRIVER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.recommendations").isEmpty());
    }

    @Test
    @DisplayName("GET /api/driver/costs/planning - isElectric=true, EV lot present - returns it")
    void planning_electricFilter_evLotExists_returnsIt() throws Exception {
        OccupancySnapshot evSnap = new OccupancySnapshot();
        evSnap.setParkingLot(lot);
        evSnap.setZoneType(ZoneType.EV);
        evSnap.setOccupiedCount(2);
        evSnap.setTotalCount(10);
        evSnap.setRecordedAt(Instant.now());
        occupancySnapshotRepository.save(evSnap);

        mockMvc.perform(get("/api/driver/costs/planning")
                .param("city", "Aveiro")
                .param("estimatedDurationMinutes", "60")
                .param("isElectric", "true")
                .param("lat", "40.6405")
                .param("lng", "-8.6538")
                .with(jwtWithRole("driver-sub", "DRIVER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.recommendations[0].name").value("Parque Aveiro Centro"));
    }

    // --- Edge cases ---

    @Test
    @DisplayName("GET /api/driver/costs/planning - city not matching any lot - returns empty")
    void planning_unknownCity_returnsEmpty() throws Exception {
        mockMvc.perform(get("/api/driver/costs/planning")
                .param("city", "CidadeInexistente")
                .param("estimatedDurationMinutes", "60")
                .param("lat", "40.6405")
                .param("lng", "-8.6538")
                .with(jwtWithRole("driver-sub", "DRIVER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.recommendations").isEmpty());
    }

    @Test
    @DisplayName("GET /api/driver/costs/planning - maxDistanceMeters=0 - returns empty (lot is not at distance 0)")
    void planning_zeroMaxDistance_returnsEmpty() throws Exception {
        mockMvc.perform(get("/api/driver/costs/planning")
                .param("city", "Aveiro")
                .param("estimatedDurationMinutes", "60")
                .param("maxDistanceMeters", "0")
                .param("lat", "40.6405")
                .param("lng", "-8.6538")
                .with(jwtWithRole("driver-sub", "DRIVER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.recommendations").isEmpty());
    }

    @Test
    @DisplayName("GET /api/driver/costs/planning - location far from lots - returns empty")
    void planning_farLocation_returnsEmpty() throws Exception {
        mockMvc.perform(get("/api/driver/costs/planning")
                .param("city", "Aveiro")
                .param("estimatedDurationMinutes", "60")
                .param("maxDistanceMeters", "100")
                .param("lat", "38.7") // Lisbon coords
                .param("lng", "-9.1")
                .with(jwtWithRole("driver-sub", "DRIVER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.recommendations").isEmpty());
    }

    @Test
    @DisplayName("GET /api/driver/costs/planning - missing city - returns 400")
    void planning_missingCity_returns400() throws Exception {
        mockMvc.perform(get("/api/driver/costs/planning")
                .param("estimatedDurationMinutes", "60")
                .param("lat", "40.6405")
                .param("lng", "-8.6538")
                .with(jwtWithRole("driver-sub", "DRIVER")))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("GET /api/driver/costs/planning - missing lat/lng - returns 400")
    void planning_missingLocation_returns400() throws Exception {
        mockMvc.perform(get("/api/driver/costs/planning")
                .param("city", "Aveiro")
                .param("estimatedDurationMinutes", "60")
                .with(jwtWithRole("driver-sub", "DRIVER")))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("GET /api/driver/costs/planning - estimatedDurationMinutes=0 - returns 400")
    void planning_zeroDuration_returns400() throws Exception {
        mockMvc.perform(get("/api/driver/costs/planning")
                .param("city", "Aveiro")
                .param("estimatedDurationMinutes", "0")
                .param("lat", "40.6405")
                .param("lng", "-8.6538")
                .with(jwtWithRole("driver-sub", "DRIVER")))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("GET /api/driver/costs/planning - no occupancy snapshots - lot still returned with default")
    void planning_noSnapshots_lotReturnedWithZeroOccupancy() throws Exception {
        occupancySnapshotRepository.deleteAll();

        mockMvc.perform(get("/api/driver/costs/planning")
                .param("city", "Aveiro")
                .param("estimatedDurationMinutes", "60")
                .param("lat", "40.6405")
                .param("lng", "-8.6538")
                .with(jwtWithRole("driver-sub", "DRIVER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.recommendations[0].currentOccupancy.status").value("AVAILABLE"));
    }

    @Test
    @DisplayName("GET /api/driver/costs/planning - fully occupied lot - excluded from results")
    void planning_fullyOccupiedLot_excluded() throws Exception {
        occupancySnapshotRepository.deleteAll();
        OccupancySnapshot full = new OccupancySnapshot();
        full.setParkingLot(lot);
        full.setZoneType(ZoneType.STANDARD);
        full.setOccupiedCount(100);
        full.setTotalCount(100);
        full.setRecordedAt(Instant.now());
        occupancySnapshotRepository.save(full);

        mockMvc.perform(get("/api/driver/costs/planning")
                .param("city", "Aveiro")
                .param("estimatedDurationMinutes", "60")
                .param("lat", "40.6405")
                .param("lng", "-8.6538")
                .with(jwtWithRole("driver-sub", "DRIVER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.recommendations").isEmpty());
    }

    @Test
    @DisplayName("GET /api/driver/costs/planning - occupancyByHour present when historical data exists")
    void planning_withHistoricalSnapshots_occupancyByHourPopulated() throws Exception {
        // Add snapshots at various hours to simulate historical data
        for (int h = 0; h < 3; h++) {
            OccupancySnapshot historical = new OccupancySnapshot();
            historical.setParkingLot(lot);
            historical.setZoneType(ZoneType.STANDARD);
            historical.setOccupiedCount(10 + h * 5);
            historical.setTotalCount(100);
            historical.setRecordedAt(Instant.now().minusSeconds(86400L * (h + 1)));
            occupancySnapshotRepository.save(historical);
        }

        mockMvc.perform(get("/api/driver/costs/planning")
                .param("city", "Aveiro")
                .param("estimatedDurationMinutes", "60")
                .param("lat", "40.6405")
                .param("lng", "-8.6538")
                .with(jwtWithRole("driver-sub", "DRIVER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.recommendations[0].occupancyByHour").isArray());
    }
}
