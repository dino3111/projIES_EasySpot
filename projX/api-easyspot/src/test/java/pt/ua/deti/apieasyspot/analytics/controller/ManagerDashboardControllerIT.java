package pt.ua.deti.apieasyspot.analytics.controller;

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

import java.util.List;

import static pt.ua.deti.apieasyspot.support.TestJwtRequests.jwtWithRole;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
class ManagerDashboardControllerIT {

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
    @DisplayName("GET /api/manager/dashboard - unauthenticated - returns 401")
    void dashboard_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/manager/dashboard"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/manager/dashboard - DRIVER role - returns 403")
    void dashboard_wrongRole_returns403() throws Exception {
        mockMvc.perform(get("/api/manager/dashboard")
                .with(jwtWithRole("sub-driver", "DRIVER")))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/manager/dashboard - MANAGER role - returns 200 with all sections")
    void dashboard_managerRole_returns200WithAllSections() throws Exception {
        mockMvc.perform(get("/api/manager/dashboard")
                .with(jwtWithRole("sub-manager", "MANAGER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.kpis").exists())
            .andExpect(jsonPath("$.seriesLast7Days").isArray())
            .andExpect(jsonPath("$.occupancyPerZone").isArray())
            .andExpect(jsonPath("$.occupancyPerHour").isArray())
            .andExpect(jsonPath("$.lastAlerts").isArray())
            .andExpect(jsonPath("$.performancePerPark").isArray());
    }
}
