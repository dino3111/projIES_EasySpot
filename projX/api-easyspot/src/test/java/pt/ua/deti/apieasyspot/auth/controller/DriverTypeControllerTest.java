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
import pt.ua.deti.apieasyspot.auth.dto.DriverTypeResponse;
import pt.ua.deti.apieasyspot.auth.model.DriverType;
import pt.ua.deti.apieasyspot.auth.service.UserProfileService;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
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
                .content("{\"type\":\"regular\"}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/driver/type - wrong role - returns 403")
    void updateDriverTypeWrongRole() throws Exception {
        mockMvc.perform(post("/api/driver/type")
                .with(jwt().jwt(j -> j.subject("some-subject").claim("groups", List.of("MANAGER"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"regular\"}"))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/driver/type - invalid payload - returns 400")
    void updateDriverTypeInvalidPayload() throws Exception {
        mockMvc.perform(post("/api/driver/type")
                .with(jwt().jwt(j -> j.subject(EXISTING_AUTHENTIK_ID).claim("groups", List.of("DRIVER"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
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
                .content("{\"type\":\"regular\"}"))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("POST /api/driver/type - success - returns 200 with correct body")
    void updateDriverTypeSuccess() throws Exception {
        when(userProfileService.updateDriverType(eq(EXISTING_AUTHENTIK_ID), eq(DriverType.REDUCED_MOBILITY)))
            .thenReturn(new DriverTypeResponse(DriverType.REDUCED_MOBILITY));

        mockMvc.perform(post("/api/driver/type")
                .with(jwt().jwt(j -> j.subject(EXISTING_AUTHENTIK_ID).claim("groups", List.of("DRIVER"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"reduced_mobility\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.type").value("reduced_mobility"));
    }
}