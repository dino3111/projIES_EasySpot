package pt.ua.deti.apieasyspot.notification.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import pt.ua.deti.apieasyspot.TestcontainersConfiguration;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.infrastructure.R2StorageService;
import pt.ua.deti.apieasyspot.notification.model.AlertType;
import pt.ua.deti.apieasyspot.notification.model.SeverityAlert;
import pt.ua.deti.apieasyspot.notification.model.StateAlert;
import pt.ua.deti.apieasyspot.notification.repository.AlertRepository;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class ReportControllerIT {

    @Autowired WebApplicationContext wac;
    @Autowired UserRepository userRepository;
    @Autowired ParkingLotRepository parkingLotRepository;
    @Autowired AlertRepository alertRepository;
    @MockitoBean JwtDecoder jwtDecoder;
    @MockitoBean R2StorageService r2StorageService;

    MockMvc mockMvc;
    User driver;
    ParkingLot parkingLot;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();

        alertRepository.deleteAll();
        parkingLotRepository.deleteAll();
        userRepository.deleteAll();

        driver = new User();
        driver.setAuthentikUserId("driver-sub-001");
        driver.setEmail("filipe@test.com");
        driver.setName("Filipe Teixeira");
        driver.setRole("DRIVER");
        driver = userRepository.save(driver);

        parkingLot = new ParkingLot();
        parkingLot.setName("Parque Central");
        parkingLot.setCity("Aveiro");
        parkingLot = parkingLotRepository.save(parkingLot);

        when(r2StorageService.upload(any(), any(), any()))
            .thenReturn("https://cdn.example.com/reports/photo.jpg");
    }

    // --- Auth / role guards ---

    @Test
    @DisplayName("POST /api/reports - unauthenticated - 401")
    void create_unauthenticated_401() throws Exception {
        mockMvc.perform(multipart("/api/reports")
                .param("parkingLotId", parkingLot.getId().toString())
                .param("zone", "A").param("spotNumber", "A12")
                .param("violationType", "accessible")
                .param("description", "Veículo sem dístico"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/reports - TECHNICAL role - 403")
    void create_technician_403() throws Exception {
        mockMvc.perform(multipart("/api/reports")
                .param("parkingLotId", parkingLot.getId().toString())
                .param("zone", "A").param("spotNumber", "A12")
                .param("violationType", "accessible")
                .param("description", "desc")
                .with(jwt().jwt(j -> j.subject("tech-sub").claim("groups", List.of("TECHNICAL")))))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/reports - MANAGER role - 403")
    void create_manager_403() throws Exception {
        mockMvc.perform(multipart("/api/reports")
                .param("parkingLotId", parkingLot.getId().toString())
                .param("zone", "A").param("spotNumber", "A12")
                .param("violationType", "accessible")
                .param("description", "desc")
                .with(jwt().jwt(j -> j.subject("mgr-sub").claim("groups", List.of("MANAGER")))))
            .andExpect(status().isForbidden());
    }

    // --- Input validation ---

    @Test
    @DisplayName("POST /api/reports - park not found - 404")
    void create_parkNotFound_404() throws Exception {
        mockMvc.perform(multipart("/api/reports")
                .param("parkingLotId", UUID.randomUUID().toString())
                .param("zone", "A").param("spotNumber", "A12")
                .param("violationType", "accessible")
                .param("description", "desc")
                .with(jwt().jwt(j -> j.subject("driver-sub-001").claim("groups", List.of("DRIVER")))))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("POST /api/reports - invalid violationType - 400")
    void create_invalidViolationType_400() throws Exception {
        mockMvc.perform(multipart("/api/reports")
                .param("parkingLotId", parkingLot.getId().toString())
                .param("zone", "A").param("spotNumber", "A12")
                .param("violationType", "SENSOR_FAULT")
                .param("description", "desc")
                .with(jwt().jwt(j -> j.subject("driver-sub-001").claim("groups", List.of("DRIVER")))))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/reports - blank description - 400")
    void create_blankDescription_400() throws Exception {
        mockMvc.perform(multipart("/api/reports")
                .param("parkingLotId", parkingLot.getId().toString())
                .param("zone", "A").param("spotNumber", "A12")
                .param("violationType", "accessible")
                .param("description", "  ")
                .with(jwt().jwt(j -> j.subject("driver-sub-001").claim("groups", List.of("DRIVER")))))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/reports - non-image file - 400")
    void create_nonImageFile_400() throws Exception {
        MockMultipartFile pdf = new MockMultipartFile("photo", "doc.pdf", "application/pdf", new byte[100]);

        mockMvc.perform(multipart("/api/reports")
                .file(pdf)
                .param("parkingLotId", parkingLot.getId().toString())
                .param("zone", "A").param("spotNumber", "A12")
                .param("violationType", "accessible")
                .param("description", "desc")
                .with(jwt().jwt(j -> j.subject("driver-sub-001").claim("groups", List.of("DRIVER")))))
            .andExpect(status().isBadRequest());
    }

    // --- Happy paths ---

    @Test
    @DisplayName("POST /api/reports - valid infraction without photo - 201 with correct body and alert persisted")
    void create_valid_201AndPersistsAlert() throws Exception {
        mockMvc.perform(multipart("/api/reports")
                .param("parkingLotId", parkingLot.getId().toString())
                .param("zone", "A").param("spotNumber", "A12")
                .param("violationType", "accessible")
                .param("vehiclePlate", "AA-12-BB")
                .param("description", "Veículo sem dístico")
                .with(jwt().jwt(j -> j.subject("driver-sub-001").claim("groups", List.of("DRIVER")))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").isNotEmpty())
            .andExpect(jsonPath("$.type").value("CLIENT"))
            .andExpect(jsonPath("$.state").value("OPEN"))
            .andExpect(jsonPath("$.severity").value("WARNING"))
            .andExpect(jsonPath("$.zone").value("A"))
            .andExpect(jsonPath("$.spotNumber").value("A12"))
            .andExpect(jsonPath("$.plate").value("AA-12-BB"))
            .andExpect(jsonPath("$.parkName").value("Parque Central"))
            .andExpect(jsonPath("$.photoUrl").doesNotExist());

        assertThat(alertRepository.count()).isEqualTo(1);
        var saved = alertRepository.findAll().get(0);
        assertThat(saved.getType()).isEqualTo(AlertType.CLIENT);
        assertThat(saved.getState()).isEqualTo(StateAlert.OPEN);
        assertThat(saved.getSpotNumber()).isEqualTo("A12");
    }

    @Test
    @DisplayName("POST /api/reports - blocking violation - 201 with severity CRITICAL")
    void create_blockingViolation_severityCritical() throws Exception {
        mockMvc.perform(multipart("/api/reports")
                .param("parkingLotId", parkingLot.getId().toString())
                .param("zone", "B").param("spotNumber", "B01")
                .param("violationType", "blocking")
                .param("description", "Bloqueia saída de emergência")
                .with(jwt().jwt(j -> j.subject("driver-sub-001").claim("groups", List.of("DRIVER")))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.severity").value("CRITICAL"));

        assertThat(alertRepository.findAll().get(0).getSeverity()).isEqualTo(SeverityAlert.CRITICAL);
    }

    @Test
    @DisplayName("POST /api/reports - with valid photo - 201 with photoUrl from R2")
    void create_withPhoto_201WithPhotoUrl() throws Exception {
        MockMultipartFile photo = new MockMultipartFile("photo", "spot.jpg", "image/jpeg", new byte[2048]);

        mockMvc.perform(multipart("/api/reports")
                .file(photo)
                .param("parkingLotId", parkingLot.getId().toString())
                .param("zone", "C").param("spotNumber", "C03")
                .param("violationType", "ev")
                .param("description", "Veículo não elétrico")
                .with(jwt().jwt(j -> j.subject("driver-sub-001").claim("groups", List.of("DRIVER")))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.photoUrl").value("https://cdn.example.com/reports/photo.jpg"));

        assertThat(alertRepository.findAll().get(0).getPhotoUrl())
            .isEqualTo("https://cdn.example.com/reports/photo.jpg");
    }

    @Test
    @DisplayName("POST /api/reports - without vehiclePlate - 201 with null plate")
    void create_withoutPlate_201NullPlate() throws Exception {
        mockMvc.perform(multipart("/api/reports")
                .param("parkingLotId", parkingLot.getId().toString())
                .param("zone", "D").param("spotNumber", "D07")
                .param("violationType", "double-parked")
                .param("description", "Dupla fila a bloquear")
                .with(jwt().jwt(j -> j.subject("driver-sub-001").claim("groups", List.of("DRIVER")))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.plate").doesNotExist());
    }
}