package pt.ua.deti.apieasyspot.sensor.controller;

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

import static pt.ua.deti.apieasyspot.support.TestJwtRequests.jwtWithRole;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class SensorLogsControllerIT {

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
    @DisplayName("GET /api/technician/sensors - unauthenticated - returns 401")
    void listSensors_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/technician/sensors"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/technician/sensors - DRIVER role - returns 403")
    void listSensors_driverRole_returns403() throws Exception {
        mockMvc.perform(get("/api/technician/sensors")
                .with(jwtWithRole("sub-driver", "DRIVER")))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/technician/sensors - MANAGER role - returns 403")
    void listSensors_managerRole_returns403() throws Exception {
        mockMvc.perform(get("/api/technician/sensors")
                .with(jwtWithRole("sub-manager", "MANAGER")))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/technician/sensors - TECHNICAL role - returns 200 with array")
    void listSensors_technicalRole_returns200() throws Exception {
        mockMvc.perform(get("/api/technician/sensors")
                .with(jwtWithRole("sub-tech", "TECHNICAL")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());
    }

    @Test
    @DisplayName("GET /api/technician/sensors/{id}/logs - unauthenticated - returns 401")
    void sensorLogs_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/technician/sensors/IR-TEST-01/logs"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/technician/sensors/{id}/logs - DRIVER role - returns 403")
    void sensorLogs_driverRole_returns403() throws Exception {
        mockMvc.perform(get("/api/technician/sensors/IR-TEST-01/logs")
                .with(jwtWithRole("sub-driver", "DRIVER")))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/technician/sensors/{id}/logs - unknown sensor - returns 404")
    void sensorLogs_unknownSensor_returns404() throws Exception {
        mockMvc.perform(get("/api/technician/sensors/SENSOR-DOES-NOT-EXIST/logs")
                .with(jwtWithRole("sub-tech", "TECHNICAL")))
            .andExpect(status().isNotFound());
    }
}
