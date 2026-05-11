package pt.ua.deti.apieasyspot.billing.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import pt.ua.deti.apieasyspot.TestTimescaleDataSourceConfig;
import pt.ua.deti.apieasyspot.billing.dto.ParkingPlanningResponse;
import pt.ua.deti.apieasyspot.billing.service.ParkingPlanningService;
import pt.ua.deti.apieasyspot.billing.service.StripeService;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static pt.ua.deti.apieasyspot.support.TestJwtRequests.jwtWithRole;

@SpringBootTest
@ActiveProfiles("test")
@Import(TestTimescaleDataSourceConfig.class)
class DriverPlanningControllerIT {

    @Autowired private WebApplicationContext wac;

    @MockitoBean private ParkingPlanningService planningService;
    @MockitoBean private StripeService stripeService;

    private MockMvc mockMvc;

    private static final ParkingPlanningResponse EMPTY_RESPONSE =
        new ParkingPlanningResponse(List.of());

    private static final ParkingPlanningResponse ONE_LOT_RESPONSE = new ParkingPlanningResponse(List.of(
        new ParkingPlanningResponse.ParkingSummary(
            UUID.fromString("00000000-0000-0000-0000-000000000001"),
            "Parque Aveiro Centro",
            "24h",
            350.5,
            "Rua João Mendonça, 12",
            BigDecimal.valueOf(1.20),
            new ParkingPlanningResponse.OccupancyInfo(20, 100, 20, "AVAILABLE"),
            List.of(
                new ParkingPlanningResponse.HourlyOccupancy("08h", 15),
                new ParkingPlanningResponse.HourlyOccupancy("09h", 35)
            )
        )
    ));

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();
        when(planningService.plan(any())).thenReturn(ONE_LOT_RESPONSE);
    }

    // --- Auth ---

    @Test
    @DisplayName("401 - unauthenticated request")
    void planning_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/driver/costs/planning")
                .param("city", "Aveiro")
                .param("estimatedDurationMinutes", "60")
                .param("lat", "40.6405")
                .param("lng", "-8.6538"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("403 - MANAGER role rejected")
    void planning_managerRole_returns403() throws Exception {
        mockMvc.perform(get("/api/driver/costs/planning")
                .param("city", "Aveiro")
                .param("estimatedDurationMinutes", "60")
                .param("lat", "40.6405")
                .param("lng", "-8.6538")
                .with(jwtWithRole("mgr", "MANAGER")))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("403 - TECHNICAL role rejected")
    void planning_technicalRole_returns403() throws Exception {
        mockMvc.perform(get("/api/driver/costs/planning")
                .param("city", "Aveiro")
                .param("estimatedDurationMinutes", "60")
                .param("lat", "40.6405")
                .param("lng", "-8.6538")
                .with(jwtWithRole("tech", "TECHNICAL")))
            .andExpect(status().isForbidden());
    }

    // --- Happy path ---

    @Test
    @DisplayName("200 - DRIVER role, default params, returns recommendations")
    void planning_driver_defaultParams_returns200WithRecommendations() throws Exception {
        mockMvc.perform(get("/api/driver/costs/planning")
                .param("city", "Aveiro")
                .param("estimatedDurationMinutes", "60")
                .param("lat", "40.6405")
                .param("lng", "-8.6538")
                .contentType(MediaType.APPLICATION_JSON)
                .with(jwtWithRole("drv", "DRIVER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.recommendations").isArray())
            .andExpect(jsonPath("$.recommendations[0].id").value("00000000-0000-0000-0000-000000000001"))
            .andExpect(jsonPath("$.recommendations[0].name").value("Parque Aveiro Centro"))
            .andExpect(jsonPath("$.recommendations[0].address").value("Rua João Mendonça, 12"))
            .andExpect(jsonPath("$.recommendations[0].openingHours").value("24h"))
            .andExpect(jsonPath("$.recommendations[0].distanceMeters").value(350.5))
            .andExpect(jsonPath("$.recommendations[0].pricePerHour").value(1.20))
            .andExpect(jsonPath("$.recommendations[0].currentOccupancy.occupied").value(20))
            .andExpect(jsonPath("$.recommendations[0].currentOccupancy.total").value(100))
            .andExpect(jsonPath("$.recommendations[0].currentOccupancy.occupancyPercent").value(20))
            .andExpect(jsonPath("$.recommendations[0].currentOccupancy.status").value("AVAILABLE"))
            .andExpect(jsonPath("$.recommendations[0].occupancyByHour").isArray())
            .andExpect(jsonPath("$.recommendations[0].occupancyByHour[0].hour").value("08h"))
            .andExpect(jsonPath("$.recommendations[0].occupancyByHour[0].occupancyPercent").value(15));
    }

    @Test
    @DisplayName("200 - orderBy=BEST accepted")
    void planning_orderByBest_returns200() throws Exception {
        mockMvc.perform(get("/api/driver/costs/planning")
                .param("city", "Aveiro")
                .param("estimatedDurationMinutes", "60")
                .param("lat", "40.6405")
                .param("lng", "-8.6538")
                .param("orderBy", "BEST")
                .with(jwtWithRole("drv", "DRIVER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.recommendations").isArray());
    }

    @Test
    @DisplayName("200 - orderBy=LOWEST_PRICE accepted")
    void planning_orderByLowestPrice_returns200() throws Exception {
        mockMvc.perform(get("/api/driver/costs/planning")
                .param("city", "Aveiro")
                .param("estimatedDurationMinutes", "30")
                .param("lat", "40.6405")
                .param("lng", "-8.6538")
                .param("orderBy", "LOWEST_PRICE")
                .with(jwtWithRole("drv", "DRIVER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.recommendations").isArray());
    }

    @Test
    @DisplayName("200 - orderBy=NEAREST accepted")
    void planning_orderByNearest_returns200() throws Exception {
        mockMvc.perform(get("/api/driver/costs/planning")
                .param("city", "Aveiro")
                .param("estimatedDurationMinutes", "30")
                .param("lat", "40.6405")
                .param("lng", "-8.6538")
                .param("orderBy", "NEAREST")
                .with(jwtWithRole("drv", "DRIVER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.recommendations").isArray());
    }

    @Test
    @DisplayName("200 - isElectric=true forwarded to service")
    void planning_isElectric_returns200() throws Exception {
        mockMvc.perform(get("/api/driver/costs/planning")
                .param("city", "Aveiro")
                .param("estimatedDurationMinutes", "60")
                .param("isElectric", "true")
                .param("lat", "40.6405")
                .param("lng", "-8.6538")
                .with(jwtWithRole("drv", "DRIVER")))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("200 - isAccessible=true forwarded to service")
    void planning_isAccessible_returns200() throws Exception {
        mockMvc.perform(get("/api/driver/costs/planning")
                .param("city", "Aveiro")
                .param("estimatedDurationMinutes", "60")
                .param("isAccessible", "true")
                .param("lat", "40.6405")
                .param("lng", "-8.6538")
                .with(jwtWithRole("drv", "DRIVER")))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("200 - empty recommendations when service returns none")
    void planning_serviceReturnsEmpty_returns200WithEmptyList() throws Exception {
        when(planningService.plan(any())).thenReturn(EMPTY_RESPONSE);
        mockMvc.perform(get("/api/driver/costs/planning")
                .param("city", "CidadeInexistente")
                .param("estimatedDurationMinutes", "60")
                .param("lat", "40.6405")
                .param("lng", "-8.6538")
                .with(jwtWithRole("drv", "DRIVER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.recommendations").isEmpty());
    }

    @Test
    @DisplayName("200 - custom maxDistanceMeters accepted")
    void planning_customMaxDistance_returns200() throws Exception {
        mockMvc.perform(get("/api/driver/costs/planning")
                .param("city", "Aveiro")
                .param("estimatedDurationMinutes", "60")
                .param("maxDistanceMeters", "2000")
                .param("lat", "40.6405")
                .param("lng", "-8.6538")
                .with(jwtWithRole("drv", "DRIVER")))
            .andExpect(status().isOk());
    }

    // --- Validation / Edge cases ---

    @Test
    @DisplayName("400 - missing city")
    void planning_missingCity_returns400() throws Exception {
        mockMvc.perform(get("/api/driver/costs/planning")
                .param("estimatedDurationMinutes", "60")
                .param("lat", "40.6405")
                .param("lng", "-8.6538")
                .with(jwtWithRole("drv", "DRIVER")))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("400 - missing lat")
    void planning_missingLat_returns400() throws Exception {
        mockMvc.perform(get("/api/driver/costs/planning")
                .param("city", "Aveiro")
                .param("estimatedDurationMinutes", "60")
                .param("lng", "-8.6538")
                .with(jwtWithRole("drv", "DRIVER")))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("400 - missing lng")
    void planning_missingLng_returns400() throws Exception {
        mockMvc.perform(get("/api/driver/costs/planning")
                .param("city", "Aveiro")
                .param("estimatedDurationMinutes", "60")
                .param("lat", "40.6405")
                .with(jwtWithRole("drv", "DRIVER")))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("400 - estimatedDurationMinutes=0 (below @Min(1))")
    void planning_zeroDuration_returns400() throws Exception {
        mockMvc.perform(get("/api/driver/costs/planning")
                .param("city", "Aveiro")
                .param("estimatedDurationMinutes", "0")
                .param("lat", "40.6405")
                .param("lng", "-8.6538")
                .with(jwtWithRole("drv", "DRIVER")))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("400 - blank city string")
    void planning_blankCity_returns400() throws Exception {
        mockMvc.perform(get("/api/driver/costs/planning")
                .param("city", "   ")
                .param("estimatedDurationMinutes", "60")
                .param("lat", "40.6405")
                .param("lng", "-8.6538")
                .with(jwtWithRole("drv", "DRIVER")))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("400 - invalid orderBy value")
    void planning_invalidOrderBy_returns400() throws Exception {
        mockMvc.perform(get("/api/driver/costs/planning")
                .param("city", "Aveiro")
                .param("estimatedDurationMinutes", "60")
                .param("lat", "40.6405")
                .param("lng", "-8.6538")
                .param("orderBy", "INVALID_VALUE")
                .with(jwtWithRole("drv", "DRIVER")))
            .andExpect(status().isBadRequest());
    }
}
