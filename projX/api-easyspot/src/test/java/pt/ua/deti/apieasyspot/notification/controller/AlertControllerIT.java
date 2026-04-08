package pt.ua.deti.apieasyspot.notification.controller;

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
import pt.ua.deti.apieasyspot.notification.model.Alert;
import pt.ua.deti.apieasyspot.notification.model.AlertType;
import pt.ua.deti.apieasyspot.notification.model.SeverityAlert;
import pt.ua.deti.apieasyspot.notification.model.StateAlert;
import pt.ua.deti.apieasyspot.notification.repository.AlertRepository;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class AlertControllerIT {

    @Autowired
    WebApplicationContext wac;

    @Autowired
    AlertRepository alertRepository;

    @Autowired
    ParkingLotRepository parkingLotRepository;

    @MockitoBean
    JwtDecoder jwtDecoder;

    MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();
    }

    @Test
    @DisplayName("PATCH /api/alerts/{id}/state - unauthenticated - returns 401")
    void updateState_unauthenticated_returns401() throws Exception {
        mockMvc.perform(patch("/api/alerts/" + UUID.randomUUID() + "/state")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"state\":\"RESOLVED\"}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("PATCH /api/alerts/{id}/state - DRIVER role - returns 403")
    void updateState_driverRole_returns403() throws Exception {
        mockMvc.perform(patch("/api/alerts/" + UUID.randomUUID() + "/state")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"state\":\"RESOLVED\"}")
                .with(jwt().jwt(j -> j.subject("sub-driver").claim("groups", List.of("DRIVER")))))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("PATCH /api/alerts/{id}/state - unknown id - returns 404")
    void updateState_unknownId_returns404() throws Exception {
        mockMvc.perform(patch("/api/alerts/" + UUID.randomUUID() + "/state")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"state\":\"RESOLVED\"}")
                .with(jwt().jwt(j -> j.subject("sub-tech").claim("groups", List.of("TECHNICAL")))))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("PATCH /api/alerts/{id}/state - invalid state - returns 400")
    void updateState_invalidState_returns400() throws Exception {
        Alert alert = savedAlert(StateAlert.OPEN);

        mockMvc.perform(patch("/api/alerts/" + alert.getId() + "/state")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"state\":\"INVALID_STATE\"}")
                .with(jwt().jwt(j -> j.subject("sub-tech").claim("groups", List.of("TECHNICAL")))))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("PATCH /api/alerts/{id}/state - RESOLVED - sets resolvedAt and returns 204")
    void updateState_toResolved_setsResolvedAt() throws Exception {
        Alert alert = savedAlert(StateAlert.OPEN);

        mockMvc.perform(patch("/api/alerts/" + alert.getId() + "/state")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"state\":\"RESOLVED\"}")
                .with(jwt().jwt(j -> j.subject("sub-tech").claim("groups", List.of("TECHNICAL")))))
            .andExpect(status().isNoContent());

        Alert updated = alertRepository.findById(alert.getId()).orElseThrow();
        assertThat(updated.getState()).isEqualTo(StateAlert.RESOLVED);
        assertThat(updated.getResolvedAt()).isNotNull();
    }

    @Test
    @DisplayName("PATCH /api/alerts/{id}/state - IN_PROGRESS - does not set resolvedAt")
    void updateState_toInProgress_doesNotSetResolvedAt() throws Exception {
        Alert alert = savedAlert(StateAlert.OPEN);

        mockMvc.perform(patch("/api/alerts/" + alert.getId() + "/state")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"state\":\"IN_PROGRESS\"}")
                .with(jwt().jwt(j -> j.subject("sub-manager").claim("groups", List.of("MANAGER")))))
            .andExpect(status().isNoContent());

        Alert updated = alertRepository.findById(alert.getId()).orElseThrow();
        assertThat(updated.getState()).isEqualTo(StateAlert.IN_PROGRESS);
        assertThat(updated.getResolvedAt()).isNull();
    }

    private Alert savedAlert(StateAlert state) {
        ParkingLot lot = new ParkingLot();
        lot.setName("Test Lot");
        lot.setCity("Aveiro");
        lot = parkingLotRepository.save(lot);

        Alert alert = new Alert();
        alert.setParkingLot(lot);
        alert.setType(AlertType.SENSOR);
        alert.setSeverity(SeverityAlert.CRITICAL);
        alert.setState(state);
        alert.setDescription("Test sensor failure");
        alert.setCreatedAt(LocalDateTime.now());
        return alertRepository.save(alert);
    }
}
