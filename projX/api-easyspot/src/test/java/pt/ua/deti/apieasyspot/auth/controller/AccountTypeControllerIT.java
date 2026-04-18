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
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class AccountTypeControllerIT {

    private static final String USER_SUBJECT = "account-it-subject";

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
        user.setAuthentikUserId(USER_SUBJECT);
        user.setEmail("user@test.com");
        user.setName("Test User");
        user.setRole("DRIVER");
        userRepository.save(user);
    }

    @Test
    @DisplayName("POST /api/account/type - unauthenticated - returns 401")
    void updateAccountType_unauthenticated_returns401() throws Exception {
        mockMvc.perform(post("/api/account/type")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"DRIVER\"}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/account/type - missing role - returns 400")
    void updateAccountType_missingRole_returns400() throws Exception {
        mockMvc.perform(post("/api/account/type")
                .with(jwt().jwt(j -> j.subject(USER_SUBJECT).claim("groups", List.of("DRIVER"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/account/type - invalid role value - returns 400")
    void updateAccountType_invalidRole_returns400() throws Exception {
        mockMvc.perform(post("/api/account/type")
                .with(jwt().jwt(j -> j.subject(USER_SUBJECT).claim("groups", List.of("DRIVER"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"SUPERADMIN\"}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/account/type - user not in DB - returns 404")
    void updateAccountType_userNotFound_returns404() throws Exception {
        mockMvc.perform(post("/api/account/type")
                .with(jwt().jwt(j -> j.subject("unknown-subject").claim("groups", List.of("DRIVER"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"DRIVER\"}"))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("POST /api/account/type - success DRIVER - persists and returns profile")
    void updateAccountType_successDriver_persistsAndReturns() throws Exception {
        mockMvc.perform(post("/api/account/type")
                .with(jwt().jwt(j -> j.subject(USER_SUBJECT).claim("groups", List.of("DRIVER"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"DRIVER\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.role").value("DRIVER"))
            .andExpect(jsonPath("$.email").value("user@test.com"))
            .andExpect(jsonPath("$.id").isNotEmpty())
            .andExpect(jsonPath("$.updatedAt").isNotEmpty());

        User updated = userRepository.findByAuthentikUserId(USER_SUBJECT).orElseThrow();
        assertThat(updated.getRole()).isEqualTo("DRIVER");
    }

    @Test
    @DisplayName("POST /api/account/type - DRIVER to MANAGER - persists new role")
    void updateAccountType_driverToManager_persistsNewRole() throws Exception {
        mockMvc.perform(post("/api/account/type")
                .with(jwt().jwt(j -> j.subject(USER_SUBJECT).claim("groups", List.of("DRIVER"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"MANAGER\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.role").value("MANAGER"));

        User updated = userRepository.findByAuthentikUserId(USER_SUBJECT).orElseThrow();
        assertThat(updated.getRole()).isEqualTo("MANAGER");
    }

    @Test
    @DisplayName("POST /api/account/type - DRIVER to TECHNICAL - persists new role")
    void updateAccountType_driverToTechnical_persistsNewRole() throws Exception {
        mockMvc.perform(post("/api/account/type")
                .with(jwt().jwt(j -> j.subject(USER_SUBJECT).claim("groups", List.of("DRIVER"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"TECHNICAL\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.role").value("TECHNICAL"));

        User updated = userRepository.findByAuthentikUserId(USER_SUBJECT).orElseThrow();
        assertThat(updated.getRole()).isEqualTo("TECHNICAL");
    }

    @Test
    @DisplayName("POST /api/account/type - idempotent - same role twice returns 200")
    void updateAccountType_idempotent_secondCallReturns200() throws Exception {
        mockMvc.perform(post("/api/account/type")
                .with(jwt().jwt(j -> j.subject(USER_SUBJECT).claim("groups", List.of("DRIVER"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"MANAGER\"}"))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/account/type")
                .with(jwt().jwt(j -> j.subject(USER_SUBJECT).claim("groups", List.of("DRIVER"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"MANAGER\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.role").value("MANAGER"));
    }

    @Test
    @DisplayName("POST /api/account/type - active session with old role - DB updated, response reflects new role")
    void updateAccountType_activeSessionOldRole_dbUpdated() throws Exception {
        mockMvc.perform(post("/api/account/type")
                .with(jwt().jwt(j -> j.subject(USER_SUBJECT).claim("groups", List.of("DRIVER"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"MANAGER\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.role").value("MANAGER"));

        User updated = userRepository.findByAuthentikUserId(USER_SUBJECT).orElseThrow();
        assertThat(updated.getRole()).isEqualTo("MANAGER");
    }
}
