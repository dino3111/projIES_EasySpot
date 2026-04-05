package pt.ua.deti.apieasyspot.vehicle.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
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
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleData;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleUpdateRequest;
import pt.ua.deti.apieasyspot.vehicle.model.Vehicle;
import pt.ua.deti.apieasyspot.vehicle.repository.VehicleRepository;
import pt.ua.deti.apieasyspot.vehicle.service.VehicleLookupClient;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class VehicleControllerIT {

    @Autowired WebApplicationContext wac;
    @Autowired VehicleRepository vehicleRepository;
    @Autowired UserRepository userRepository;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean VehicleLookupClient vehicleLookupClient;
    @MockitoBean JwtDecoder jwtDecoder;

    MockMvc mockMvc;
    private User user;
    private Vehicle vehicle;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();
        vehicleRepository.deleteAll();
        userRepository.deleteAll();

        user = new User();
        user.setAuthentikUserId("auth-sub-123");
        user.setEmail("driver@test.com");
        user.setName("Test Driver");
        user.setRole("DRIVER");
        user = userRepository.save(user);

        vehicle = new Vehicle();
        vehicle.setUser(user);
        vehicle.setPlate("AA-00-AA");
        vehicle.setMake("Opel");
        vehicle.setModel("Corsa");
        vehicle.setFuelType("Gasolina");
        vehicle.setYear(2021);
        vehicle = vehicleRepository.save(vehicle);
    }

    @Test
    @DisplayName("PUT /api/vehicles/{id} - unauthenticated - returns 401")
    void updateVehicle_unauthenticated_returns401() throws Exception {
        VehicleUpdateRequest request = new VehicleUpdateRequest("AA-00-AA", null, false);

        mockMvc.perform(put("/api/vehicles/{id}", vehicle.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("PUT /api/vehicles/{id} - wrong role - returns 403")
    void updateVehicle_wrongRole_returns403() throws Exception {
        VehicleUpdateRequest request = new VehicleUpdateRequest("AA-00-AA", null, false);

        mockMvc.perform(put("/api/vehicles/{id}", vehicle.getId())
                .with(jwt().jwt(j -> j.subject("auth-sub-123").claim("groups", List.of("MANAGER"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("PUT /api/vehicles/{id} - same plate - returns 200, does not call lookup")
    void updateVehicle_samePlate_returns200WithoutLookup() throws Exception {
        VehicleUpdateRequest request = new VehicleUpdateRequest("AA-00-AA", "my car", true);

        mockMvc.perform(put("/api/vehicles/{id}", vehicle.getId())
                .with(jwt().jwt(j -> j.subject("auth-sub-123").claim("groups", List.of("DRIVER"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.plate").value("AA-00-AA"))
            .andExpect(jsonPath("$.nickname").value("my car"));

        verifyNoInteractions(vehicleLookupClient);
    }

    @Test
    @DisplayName("PUT /api/vehicles/{id} - plate changed - calls lookup and returns 200")
    void updateVehicle_plateChanged_callsLookupAndReturns200() throws Exception {
        VehicleUpdateRequest request = new VehicleUpdateRequest("BB-00-BB", "new car", false);
        VehicleData data = new VehicleData(
            "BB-00-BB", null, "Renault", "Clio",
            null, null, null, "Gasolina",
            null, null, null, null, null, null,
            null, null, null, null, null, null
        );

        when(vehicleLookupClient.lookup("BB-00-BB")).thenReturn(data);

        mockMvc.perform(put("/api/vehicles/{id}", vehicle.getId())
                .with(jwt().jwt(j -> j.subject("auth-sub-123").claim("groups", List.of("DRIVER"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.plate").value("BB-00-BB"))
            .andExpect(jsonPath("$.make").value("Renault"))
            .andExpect(jsonPath("$.model").value("Clio"));

        verify(vehicleLookupClient).lookup("BB-00-BB");
    }

    @Test
    @DisplayName("PUT /api/vehicles/{id} - vehicle not found - returns 404")
    void updateVehicle_vehicleNotFound_returns404() throws Exception {
        VehicleUpdateRequest request = new VehicleUpdateRequest("AA-00-AA", null, false);

        mockMvc.perform(put("/api/vehicles/{id}", UUID.randomUUID())
                .with(jwt().jwt(j -> j.subject("auth-sub-123").claim("groups", List.of("DRIVER"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("DELETE /api/vehicles/{id} - unauthenticated - returns 401")
    void deleteVehicle_unauthenticated_returns401() throws Exception {
        mockMvc.perform(delete("/api/vehicles/{id}", vehicle.getId()))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("DELETE /api/vehicles/{id} - success - returns 204 and removes vehicle")
    void deleteVehicle_success_returns204() throws Exception {
        mockMvc.perform(delete("/api/vehicles/{id}", vehicle.getId())
                .with(jwt().jwt(j -> j.subject("auth-sub-123").claim("groups", List.of("DRIVER")))))
            .andExpect(status().isNoContent());

        assertThat(vehicleRepository.findById(vehicle.getId())).isEmpty();
    }

    @Test
    @DisplayName("DELETE /api/vehicles/{id} - vehicle not found - returns 404")
    void deleteVehicle_vehicleNotFound_returns404() throws Exception {
        mockMvc.perform(delete("/api/vehicles/{id}", UUID.randomUUID())
                .with(jwt().jwt(j -> j.subject("auth-sub-123").claim("groups", List.of("DRIVER")))))
            .andExpect(status().isNotFound());
    }
}
