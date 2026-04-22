package pt.ua.deti.apieasyspot.auth.controller;

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
import pt.ua.deti.apieasyspot.auth.model.DriverType;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static pt.ua.deti.apieasyspot.support.TestJwtRequests.jwtWithRole;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class DriverTypeControllerIT {

    private static final String DRIVER_SUBJECT = "driver-it-subject";

    @Autowired
    WebApplicationContext wac;

    @Autowired
    UserRepository userRepository;

    @MockitoBean
    JwtDecoder jwtDecoder;

    MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();
        userRepository.deleteAll();
        User user = new User();
        user.setAuthentikUserId(DRIVER_SUBJECT);
        user.setEmail("driver@test.com");
        user.setName("Test Driver");
        user.setRole("DRIVER");
        userRepository.save(user);
    }

    @Test
    @DisplayName("POST /api/driver/type - unauthenticated - returns 401")
    void updateDriverType_unauthenticated_returns401() throws Exception {
        mockMvc.perform(post("/api/driver/type")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"driverType\":\"regular\"}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/driver/type - wrong role - returns 403")
    void updateDriverType_wrongRole_returns403() throws Exception {
        mockMvc.perform(post("/api/driver/type")
                .with(jwtWithRole("some-subject", "MANAGER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"driverType\":\"regular\"}"))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/driver/type - missing driverType - returns 400")
    void updateDriverType_missingDriverType_returns400() throws Exception {
        mockMvc.perform(post("/api/driver/type")
                .with(jwtWithRole(DRIVER_SUBJECT, "DRIVER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/driver/type - invalid enum value - returns 400")
    void updateDriverType_invalidEnumValue_returns400() throws Exception {
        mockMvc.perform(post("/api/driver/type")
                .with(jwtWithRole(DRIVER_SUBJECT, "DRIVER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"driverType\":\"invalid_type\"}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/driver/type - user not found - returns 404")
    void updateDriverType_userNotFound_returns404() throws Exception {
        mockMvc.perform(post("/api/driver/type")
                .with(jwtWithRole("missing-subject", "DRIVER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"driverType\":\"regular\"}"))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("POST /api/driver/type - success - persists to DB and returns profile excerpt")
    void updateDriverType_success_persistsAndReturnsProfile() throws Exception {
        mockMvc.perform(post("/api/driver/type")
                .with(jwtWithRole(DRIVER_SUBJECT, "DRIVER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"driverType\":\"reduced_mobility\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.driverType").value("reduced_mobility"))
            .andExpect(jsonPath("$.email").value("driver@test.com"))
            .andExpect(jsonPath("$.name").value("Test Driver"))
            .andExpect(jsonPath("$.role").value("DRIVER"))
            .andExpect(jsonPath("$.id").isNotEmpty());

        User updated = userRepository.findByAuthentikUserId(DRIVER_SUBJECT).orElseThrow();
        assertThat(updated.getDriverType()).isEqualTo(DriverType.REDUCED_MOBILITY);
    }

    @Test
    @DisplayName("POST /api/driver/type - idempotent update - second call persists correctly")
    void updateDriverType_idempotentUpdate_persistsCorrectly() throws Exception {
        mockMvc.perform(post("/api/driver/type")
                .with(jwtWithRole(DRIVER_SUBJECT, "DRIVER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"driverType\":\"ev\"}"))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/driver/type")
                .with(jwtWithRole(DRIVER_SUBJECT, "DRIVER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"driverType\":\"ev\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.driverType").value("ev"));

        User updated = userRepository.findByAuthentikUserId(DRIVER_SUBJECT).orElseThrow();
        assertThat(updated.getDriverType()).isEqualTo(DriverType.EV);
    }
}
