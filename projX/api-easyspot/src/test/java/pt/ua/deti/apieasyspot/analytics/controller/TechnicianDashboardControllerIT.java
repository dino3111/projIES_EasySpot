package pt.ua.deti.apieasyspot.analytics.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import pt.ua.deti.apieasyspot.TestcontainersConfiguration;

import java.util.List;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class TechnicianDashboardControllerIT {

    @Autowired
    WebApplicationContext wac;

    @MockitoBean
    JwtDecoder jwtDecoder;

    MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();
    }

    @Test
    @DisplayName("GET /api/technician/dashboard - unauthenticated - returns 401")
    void dashboard_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/technician/dashboard"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/technician/dashboard - DRIVER role - returns 403")
    void dashboard_driverRole_returns403() throws Exception {
        mockMvc.perform(get("/api/technician/dashboard")
                .with(jwt().jwt(j -> j.subject("sub-driver").claim("groups", List.of("DRIVER")))))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/technician/dashboard - MANAGER role - returns 403")
    void dashboard_managerRole_returns403() throws Exception {
        mockMvc.perform(get("/api/technician/dashboard")
                .with(jwt().jwt(j -> j.subject("sub-manager").claim("groups", List.of("MANAGER")))))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/technician/dashboard - TECHNICAL role - returns 200 with all sections")
    void dashboard_technicalRole_returns200WithAllSections() throws Exception {
        mockMvc.perform(get("/api/technician/dashboard")
                .with(jwt().jwt(j -> j.subject("sub-tech").claim("groups", List.of("TECHNICAL")))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.kpis").exists())
            .andExpect(jsonPath("$.kpis.totalSensors").isNumber())
            .andExpect(jsonPath("$.kpis.operationalSensors").isNumber())
            .andExpect(jsonPath("$.kpis.uptimePct").isNumber())
            .andExpect(jsonPath("$.kpis.failuresToday").isNumber())
            .andExpect(jsonPath("$.kpis.meanTimeToRepair").isString())
            .andExpect(jsonPath("$.uptimeLast7Days").isArray())
            .andExpect(jsonPath("$.sensorDistribution").isArray())
            .andExpect(jsonPath("$.urgentWorkOrders").isArray());
    }
}
