package pt.ua.deti.apieasyspot.auth.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import pt.ua.deti.apieasyspot.auth.SecurityConfig;
import pt.ua.deti.apieasyspot.auth.model.DriverType;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.service.UserProfileService;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static pt.ua.deti.apieasyspot.support.TestJwtRequests.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DriverTypeController.class)
@Import(SecurityConfig.class)
class DriverTypeControllerTest {

    private static final String EXISTING_AUTHENTIK_ID = "driver-subject-123";

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    UserProfileService userProfileService;

    @MockitoBean
    JwtDecoder jwtDecoder;

    @Test
    @DisplayName("POST /api/driver/type - unauthenticated - returns 401")
    void updateDriverTypeUnauthenticated() throws Exception {
        mockMvc.perform(post("/api/driver/type")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"driverType\":\"regular\"}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/driver/type - wrong role - returns 403")
    void updateDriverTypeWrongRole() throws Exception {
        mockMvc.perform(post("/api/driver/type")
                .with(jwt().jwt(j -> j.subject("some-subject").claim("groups", List.of("MANAGER"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"driverType\":\"regular\"}"))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/driver/type - missing driverType - returns 400")
    void updateDriverTypeInvalidPayload() throws Exception {
        mockMvc.perform(post("/api/driver/type")
                .with(jwt().jwt(j -> j.subject(EXISTING_AUTHENTIK_ID).claim("groups", List.of("DRIVER"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/driver/type - invalid enum value - returns 400")
    void updateDriverTypeInvalidEnumValue() throws Exception {
        mockMvc.perform(post("/api/driver/type")
                .with(jwt().jwt(j -> j.subject(EXISTING_AUTHENTIK_ID).claim("groups", List.of("DRIVER"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"driverType\":\"invalid_type\"}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/driver/type - user not found - returns 404")
    void updateDriverTypeUserNotFound() throws Exception {
        when(userProfileService.updateDriverType(eq("missing-subject"), any()))
            .thenThrow(new ResourceNotFoundException("User not found: missing-subject"));

        mockMvc.perform(post("/api/driver/type")
                .with(jwt().jwt(j -> j.subject("missing-subject").claim("groups", List.of("DRIVER"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"driverType\":\"regular\"}"))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("POST /api/driver/type - success - returns 200 with profile excerpt")
    void updateDriverTypeSuccess() throws Exception {
        when(userProfileService.updateDriverType(EXISTING_AUTHENTIK_ID, DriverType.REDUCED_MOBILITY))
            .thenReturn(buildUser(DriverType.REDUCED_MOBILITY));

        mockMvc.perform(post("/api/driver/type")
                .with(jwt().jwt(j -> j.subject(EXISTING_AUTHENTIK_ID).claim("groups", List.of("DRIVER"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"driverType\":\"reduced_mobility\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.driverType").value("reduced_mobility"))
            .andExpect(jsonPath("$.email").value("driver@test.com"))
            .andExpect(jsonPath("$.name").value("Test Driver"))
            .andExpect(jsonPath("$.role").value("DRIVER"));
    }

    @Test
    @DisplayName("POST /api/driver/type - explicit userId in body - uses it over JWT subject")
    void updateDriverTypeExplicitUserId() throws Exception {
        String explicitUserId = "explicit-user-id";
        when(userProfileService.updateDriverType(explicitUserId, DriverType.EV))
            .thenReturn(buildUser(DriverType.EV));

        mockMvc.perform(post("/api/driver/type")
                .with(jwt().jwt(j -> j.subject(EXISTING_AUTHENTIK_ID).claim("groups", List.of("DRIVER"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"driverType\":\"ev\",\"userId\":\"" + explicitUserId + "\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.driverType").value("ev"));
    }

    private User buildUser(DriverType driverType) {
        User user = new User();
        user.setId(UUID.fromString("00000000-0000-0000-0000-000000000001"));
        user.setAuthentikUserId(EXISTING_AUTHENTIK_ID);
        user.setEmail("driver@test.com");
        user.setName("Test Driver");
        user.setRole("DRIVER");
        user.setDriverType(driverType);
        return user;
    }
}