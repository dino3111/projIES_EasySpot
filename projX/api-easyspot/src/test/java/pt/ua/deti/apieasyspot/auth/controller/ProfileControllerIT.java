package pt.ua.deti.apieasyspot.auth.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.test.context.ActiveProfiles;
import pt.ua.deti.apieasyspot.TestcontainersConfiguration;
import pt.ua.deti.apieasyspot.TestTimescaleDataSourceConfig;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.infrastructure.R2StorageService;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ActiveProfiles("test")
@SpringBootTest
@Import({TestcontainersConfiguration.class, TestTimescaleDataSourceConfig.class})
class ProfileControllerIT {

    private static final String DRIVER_SUBJECT = "profile-it-driver";
    private static final String MANAGER_SUBJECT = "profile-it-manager";
    private static final String TECHNICIAN_SUBJECT = "profile-it-technician";

    @Autowired WebApplicationContext wac;
    @Autowired UserRepository userRepository;
    @MockitoBean JwtDecoder jwtDecoder;
    @MockitoBean R2StorageService r2StorageService;

    MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();
        userRepository.deleteAll();
        userRepository.save(buildUser(DRIVER_SUBJECT, "driver@test.com", "DRIVER"));
        userRepository.save(buildUser(MANAGER_SUBJECT, "manager@test.com", "MANAGER"));
        userRepository.save(buildUser(TECHNICIAN_SUBJECT, "tech@test.com", "TECHNICAL"));
    }

    @Test
    @DisplayName("GET /api/profile - unauthenticated - returns 401")
    void getProfile_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/profile")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/profile - DRIVER - returns driver-specific fields")
    void getProfile_driver_returnsDriverFields() throws Exception {
        mockMvc.perform(get("/api/profile")
                .with(jwt().jwt(j -> j.subject(DRIVER_SUBJECT).claim("groups", List.of("DRIVER")))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("driver@test.com"))
            .andExpect(jsonPath("$.role").value("DRIVER"))
            .andExpect(jsonPath("$.notificationsEnabled").value(true))
            .andExpect(jsonPath("$.pushNotificationsEnabled").value(true))
            .andExpect(jsonPath("$.emailNotificationsEnabled").value(false))
            .andExpect(jsonPath("$.spending").exists())
            .andExpect(jsonPath("$.favoritesCount").value(0));
    }

    @Test
    @DisplayName("GET /api/profile - MANAGER - returns manager-specific fields")
    void getProfile_manager_returnsManagerFields() throws Exception {
        mockMvc.perform(get("/api/profile")
                .with(jwt().jwt(j -> j.subject(MANAGER_SUBJECT).claim("groups", List.of("MANAGER")))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("manager@test.com"))
            .andExpect(jsonPath("$.role").value("MANAGER"))
            .andExpect(jsonPath("$.managedParks").isNumber())
            .andExpect(jsonPath("$.todayRevenue").isNumber())
            .andExpect(jsonPath("$.todayVehicles").isNumber())
            .andExpect(jsonPath("$.openAlerts").isNumber());
    }

    @Test
    @DisplayName("GET /api/profile - TECHNICAL - returns technician-specific fields")
    void getProfile_technician_returnsTechnicianFields() throws Exception {
        mockMvc.perform(get("/api/profile")
                .with(jwt().jwt(j -> j.subject(TECHNICIAN_SUBJECT).claim("groups", List.of("TECHNICAL")))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("tech@test.com"))
            .andExpect(jsonPath("$.role").value("TECHNICAL"))
            .andExpect(jsonPath("$.assignedTasks").isNumber())
            .andExpect(jsonPath("$.sensorSummary").exists())
            .andExpect(jsonPath("$.openFaults").isNumber());
    }

    @Test
    @DisplayName("GET /api/profile - user not in DB - returns 404 (EC-1)")
    void getProfile_userNotInDb_returns404() throws Exception {
        mockMvc.perform(get("/api/profile")
                .with(jwt().jwt(j -> j.subject("ghost-subject").claim("groups", List.of("DRIVER")))))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("PUT /api/profile - unauthenticated - returns 401")
    void updateProfile_unauthenticated_returns401() throws Exception {
        mockMvc.perform(put("/api/profile")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("PUT /api/profile - update notificationsEnabled - persists to DB")
    void updateProfile_notificationsEnabled_persists() throws Exception {
        mockMvc.perform(put("/api/profile")
                .with(jwt().jwt(j -> j.subject(DRIVER_SUBJECT).claim("groups", List.of("DRIVER"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"notificationsEnabled\":false}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.notificationsEnabled").value(false));

        User updated = userRepository.findByAuthentikUserId(DRIVER_SUBJECT).orElseThrow();
        assertThat(updated.isNotificationsEnabled()).isFalse();
    }

    @Test
    @DisplayName("PUT /api/profile - update push/email notification preferences - persists to DB")
    void updateProfile_notificationPreferences_persist() throws Exception {
        mockMvc.perform(put("/api/profile")
                .with(jwt().jwt(j -> j.subject(DRIVER_SUBJECT).claim("groups", List.of("DRIVER"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"pushNotificationsEnabled\":true,\"emailNotificationsEnabled\":false}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.pushNotificationsEnabled").value(true))
            .andExpect(jsonPath("$.emailNotificationsEnabled").value(false));

        User updated = userRepository.findByAuthentikUserId(DRIVER_SUBJECT).orElseThrow();
        assertThat(updated.isPushNotificationsEnabled()).isTrue();
        assertThat(updated.isEmailNotificationsEnabled()).isFalse();
        assertThat(updated.isNotificationsEnabled()).isTrue();
    }

    @Test
    @DisplayName("PUT /api/profile - update driverType for DRIVER - persists")
    void updateProfile_driverType_persistsForDriver() throws Exception {
        mockMvc.perform(put("/api/profile")
                .with(jwt().jwt(j -> j.subject(DRIVER_SUBJECT).claim("groups", List.of("DRIVER"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"driverType\":\"ev\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.driverType").value("ev"));
    }

    @Test
    @DisplayName("PUT /api/profile - driverType on MANAGER - returns 400 (EC-11)")
    void updateProfile_driverTypeOnManager_returns400() throws Exception {
        mockMvc.perform(put("/api/profile")
                .with(jwt().jwt(j -> j.subject(MANAGER_SUBJECT).claim("groups", List.of("MANAGER"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"driverType\":\"ev\"}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("PUT /api/profile - driverType on TECHNICAL - returns 400 (EC-11)")
    void updateProfile_driverTypeOnTechnician_returns400() throws Exception {
        mockMvc.perform(put("/api/profile")
                .with(jwt().jwt(j -> j.subject(TECHNICIAN_SUBJECT).claim("groups", List.of("TECHNICAL"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"driverType\":\"ev\"}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("PUT /api/profile - empty body - returns 200 no-op (EC-3)")
    void updateProfile_emptyBody_returnsOk() throws Exception {
        mockMvc.perform(put("/api/profile")
                .with(jwt().jwt(j -> j.subject(DRIVER_SUBJECT).claim("groups", List.of("DRIVER"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("PUT /api/profile - user not in DB - returns 404 (EC-1)")
    void updateProfile_userNotInDb_returns404() throws Exception {
        mockMvc.perform(put("/api/profile")
                .with(jwt().jwt(j -> j.subject("ghost-subject").claim("groups", List.of("DRIVER"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"notificationsEnabled\":true}"))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("GET /api/profile - missing groups claim - returns 400")
    void getProfile_missingGroupsClaim_returns400() throws Exception {
        mockMvc.perform(get("/api/profile")
                .with(jwt().jwt(j -> j.subject(DRIVER_SUBJECT))))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("PUT /api/profile - missing groups claim - returns 400 and does not persist")
    void updateProfile_missingGroupsClaim_returns400AndDoesNotPersist() throws Exception {
        mockMvc.perform(put("/api/profile")
                .with(jwt().jwt(j -> j.subject(DRIVER_SUBJECT)))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"notificationsEnabled\":false}"))
            .andExpect(status().isBadRequest());

        User unchanged = userRepository.findByAuthentikUserId(DRIVER_SUBJECT).orElseThrow();
        assertThat(unchanged.isNotificationsEnabled()).isTrue();
    }

    @Test
    @DisplayName("PUT /api/profile - extra JSON fields are silently ignored (EC-4)")
    void updateProfile_unknownFields_silentlyIgnored() throws Exception {
        mockMvc.perform(put("/api/profile")
                .with(jwt().jwt(j -> j.subject(DRIVER_SUBJECT).claim("groups", List.of("DRIVER"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"notificationsEnabled\":true,\"role\":\"ADMIN\",\"email\":\"hacked@evil.com\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("driver@test.com"))
            .andExpect(jsonPath("$.role").value("DRIVER"));
    }

    @Test
    @DisplayName("POST /api/profile/photo - authenticated - uploads and persists photoUrl")
    void uploadPhoto_authenticated_persistsPhotoUrl() throws Exception {
        when(r2StorageService.upload(anyString(), any(byte[].class), eq("image/png")))
            .thenReturn("https://cdn.example/profiles/driver.png");
        MockMultipartFile photo = new MockMultipartFile("photo", "driver.png", "image/png", new byte[]{1, 2, 3});

        mockMvc.perform(multipart("/api/profile/photo")
                .file(photo)
                .with(jwt().jwt(j -> j.subject(DRIVER_SUBJECT).claim("groups", List.of("DRIVER")))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.photoUrl").value("https://cdn.example/profiles/driver.png"));

        User updated = userRepository.findByAuthentikUserId(DRIVER_SUBJECT).orElseThrow();
        assertThat(updated.getPhotoUrl()).isEqualTo("https://cdn.example/profiles/driver.png");
    }

    @Test
    @DisplayName("POST /api/profile/photo - invalid file type - returns 400")
    void uploadPhoto_invalidType_returns400() throws Exception {
        MockMultipartFile photo = new MockMultipartFile("photo", "driver.gif", "image/gif", new byte[]{1});

        mockMvc.perform(multipart("/api/profile/photo")
                .file(photo)
                .with(jwt().jwt(j -> j.subject(DRIVER_SUBJECT).claim("groups", List.of("DRIVER")))))
            .andExpect(status().isBadRequest());
    }

    private User buildUser(String authentikId, String email, String role) {
        User user = new User();
        user.setAuthentikUserId(authentikId);
        user.setEmail(email);
        user.setName("Test " + role);
        user.setRole(role);
        user.setPushNotificationsEnabled(true);
        user.setEmailNotificationsEnabled(false);
        user.setNotificationsEnabled(true);
        return user;
    }
}
