package pt.ua.deti.apieasyspot.auth.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import pt.ua.deti.apieasyspot.auth.SecurityConfig;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.model.UserRole;
import pt.ua.deti.apieasyspot.auth.service.UserProfileService;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AccountTypeController.class)
@Import(SecurityConfig.class)
class AccountTypeControllerTest {

    private static final String EXISTING_SUBJECT = "user-subject-123";

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    UserProfileService userProfileService;

    @MockitoBean
    JwtDecoder jwtDecoder;

    @Test
    @DisplayName("POST /api/account/type - unauthenticated - returns 401")
    void updateAccountType_unauthenticated_returns401() throws Exception {
        mockMvc.perform(post("/api/account/type")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"DRIVER\"}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/account/type - missing role field - returns 400")
    void updateAccountType_missingRole_returns400() throws Exception {
        mockMvc.perform(post("/api/account/type")
                .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_DRIVER"))
                    .jwt(j -> j.subject(EXISTING_SUBJECT)))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/account/type - invalid role value - returns 400")
    void updateAccountType_invalidRole_returns400() throws Exception {
        mockMvc.perform(post("/api/account/type")
                .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_DRIVER"))
                    .jwt(j -> j.subject(EXISTING_SUBJECT)))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"SUPERADMIN\"}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/account/type - user not found - returns 404")
    void updateAccountType_userNotFound_returns404() throws Exception {
        when(userProfileService.updateRole(eq("missing-sub"), any()))
            .thenThrow(new ResourceNotFoundException("User not found: missing-sub"));

        mockMvc.perform(post("/api/account/type")
                .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_DRIVER"))
                    .jwt(j -> j.subject("missing-sub")))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"DRIVER\"}"))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("POST /api/account/type - success DRIVER - returns 200 with profile")
    void updateAccountType_successDriver_returns200() throws Exception {
        when(userProfileService.updateRole(EXISTING_SUBJECT, UserRole.DRIVER))
            .thenReturn(buildUser("DRIVER"));

        mockMvc.perform(post("/api/account/type")
                .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_DRIVER"))
                    .jwt(j -> j.subject(EXISTING_SUBJECT)))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"DRIVER\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.role").value("DRIVER"))
            .andExpect(jsonPath("$.email").value("user@test.com"))
            .andExpect(jsonPath("$.id").isNotEmpty())
            .andExpect(jsonPath("$.updatedAt").isNotEmpty());
    }

    @Test
    @DisplayName("POST /api/account/type - success MANAGER - returns 200 with updated role")
    void updateAccountType_successManager_returns200() throws Exception {
        when(userProfileService.updateRole(EXISTING_SUBJECT, UserRole.MANAGER))
            .thenReturn(buildUser("MANAGER"));

        mockMvc.perform(post("/api/account/type")
                .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_DRIVER"))
                    .jwt(j -> j.subject(EXISTING_SUBJECT)))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"MANAGER\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.role").value("MANAGER"));
    }

    @Test
    @DisplayName("POST /api/account/type - success TECHNICAL - returns 200 with updated role")
    void updateAccountType_successTechnical_returns200() throws Exception {
        when(userProfileService.updateRole(EXISTING_SUBJECT, UserRole.TECHNICAL))
            .thenReturn(buildUser("TECHNICAL"));

        mockMvc.perform(post("/api/account/type")
                .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_DRIVER"))
                    .jwt(j -> j.subject(EXISTING_SUBJECT)))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"TECHNICAL\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.role").value("TECHNICAL"));
    }

    @Test
    @DisplayName("POST /api/account/type - role case insensitive - DRIVER lowercase accepted")
    void updateAccountType_lowercaseRole_returns200() throws Exception {
        when(userProfileService.updateRole(EXISTING_SUBJECT, UserRole.DRIVER))
            .thenReturn(buildUser("DRIVER"));

        mockMvc.perform(post("/api/account/type")
                .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_DRIVER"))
                    .jwt(j -> j.subject(EXISTING_SUBJECT)))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"driver\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.role").value("DRIVER"));
    }

    private User buildUser(String role) {
        User user = new User();
        user.setId(UUID.fromString("00000000-0000-0000-0000-000000000001"));
        user.setAuthentikUserId(EXISTING_SUBJECT);
        user.setEmail("user@test.com");
        user.setName("Test User");
        user.setRole(role);
        user.setUpdatedAt(LocalDateTime.now());
        return user;
    }
}
