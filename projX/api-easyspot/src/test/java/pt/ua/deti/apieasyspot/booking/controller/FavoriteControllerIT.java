package pt.ua.deti.apieasyspot.booking.controller;

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
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.booking.repository.UserFavoriteRepository;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static pt.ua.deti.apieasyspot.support.TestJwtRequests.jwtWithRole;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class FavoriteControllerIT {

    @Autowired WebApplicationContext wac;
    @Autowired UserRepository userRepository;
    @Autowired ParkingLotRepository parkingLotRepository;
    @Autowired UserFavoriteRepository userFavoriteRepository;
    @MockitoBean JwtDecoder jwtDecoder;

    MockMvc mockMvc;
    private User user;
    private ParkingLot parkingLot;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();
        userFavoriteRepository.deleteAll();
        parkingLotRepository.deleteAll();
        userRepository.deleteAll();

        user = new User();
        user.setAuthentikUserId("auth-sub-123");
        user.setEmail("driver@test.com");
        user.setName("Test Driver");
        user.setRole("DRIVER");
        user = userRepository.save(user);

        parkingLot = new ParkingLot();
        parkingLot.setName("Parque Central");
        parkingLot.setCity("Aveiro");
        parkingLot = parkingLotRepository.save(parkingLot);
    }

    @Test
    @DisplayName("POST /api/parks/{id}/favorite - unauthenticated - returns 401")
    void toggleFavorite_unauthenticated_returns401() throws Exception {
        mockMvc.perform(post("/api/parks/{id}/favorite", parkingLot.getId()))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/parks/{id}/favorite - wrong role - returns 403")
    void toggleFavorite_wrongRole_returns403() throws Exception {
        mockMvc.perform(post("/api/parks/{id}/favorite", parkingLot.getId())
                .with(jwtWithRole("auth-sub-123", "MANAGER")))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/parks/{id}/favorite - park not found - returns 404")
    void toggleFavorite_parkNotFound_returns404() throws Exception {
        mockMvc.perform(post("/api/parks/{id}/favorite", UUID.randomUUID())
                .with(jwtWithRole("auth-sub-123", "DRIVER")))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("POST /api/parks/{id}/favorite - first toggle - returns isFavorite true and persists")
    void toggleFavorite_firstToggle_returnsTrueAndPersists() throws Exception {
        mockMvc.perform(post("/api/parks/{id}/favorite", parkingLot.getId())
                .with(jwtWithRole("auth-sub-123", "DRIVER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.parkId").value(parkingLot.getId().toString()))
            .andExpect(jsonPath("$.isFavorite").value(true));

        assertThat(userFavoriteRepository
            .existsByUserIdAndParkingLotId(user.getId(), parkingLot.getId())).isTrue();
    }

    @Test
    @DisplayName("POST /api/parks/{id}/favorite - second toggle - returns isFavorite false and removes")
    void toggleFavorite_secondToggle_returnsFalseAndRemoves() throws Exception {
        mockMvc.perform(post("/api/parks/{id}/favorite", parkingLot.getId())
                .with(jwtWithRole("auth-sub-123", "DRIVER")))
            .andExpect(jsonPath("$.isFavorite").value(true));

        mockMvc.perform(post("/api/parks/{id}/favorite", parkingLot.getId())
                .with(jwtWithRole("auth-sub-123", "DRIVER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.parkId").value(parkingLot.getId().toString()))
            .andExpect(jsonPath("$.isFavorite").value(false));

        assertThat(userFavoriteRepository
            .existsByUserIdAndParkingLotId(user.getId(), parkingLot.getId())).isFalse();
    }
}
