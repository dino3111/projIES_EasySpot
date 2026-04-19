package pt.ua.deti.apieasyspot.vehicle.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleCreateRequest;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleData;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleUpdateRequest;
import pt.ua.deti.apieasyspot.vehicle.model.Vehicle;
import pt.ua.deti.apieasyspot.vehicle.repository.VehicleRepository;
import pt.ua.deti.apieasyspot.vehicle.service.VehicleLookupClient;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import static pt.ua.deti.apieasyspot.support.TestJwtRequests.jwtWithRole;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.kafka.KafkaAutoConfiguration"
})
@AutoConfigureMockMvc
class VehicleControllerIT {

    @Autowired MockMvc mockMvc;
    @Autowired VehicleRepository vehicleRepository;
    @Autowired UserRepository userRepository;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean VehicleLookupClient vehicleLookupClient;
    @MockitoBean JwtDecoder jwtDecoder;

    private User user;
    private Vehicle vehicle;

    @BeforeEach
    void setUp() {
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
    @DisplayName("POST /api/vehicles - success")
    void createVehicle_success() throws Exception {
        VehicleCreateRequest request = new VehicleCreateRequest("BB-00-BB", "RFID-1");
        VehicleData data = new VehicleData(
            "BB-00-BB", "VIN123", "Tesla", "Model 3",
            null, null, null, "Elétrico",
            null, null, null, null, null, null,
            null, null, null, null, null, null
        );

        when(vehicleLookupClient.lookup("BB-00-BB")).thenReturn(data);

        mockMvc.perform(post("/api/vehicles")
                .with(jwtWithRole("auth-sub-123", "DRIVER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.plate").value("BB-00-BB"))
            .andExpect(jsonPath("$.make").value("Tesla"))
            .andExpect(jsonPath("$.isEv").value(true));

        assertThat(vehicleRepository.findByPlate("BB-00-BB")).isPresent();
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
    @DisplayName("PUT /api/vehicles/{id} - same plate - returns 200, does not call lookup")
    void updateVehicle_samePlate_returns200WithoutLookup() throws Exception {
        VehicleUpdateRequest request = new VehicleUpdateRequest("AA-00-AA", "my car", true);

        mockMvc.perform(put("/api/vehicles/{id}", vehicle.getId())
                .with(jwtWithRole("auth-sub-123", "DRIVER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.plate").value("AA-00-AA"))
            .andExpect(jsonPath("$.nickname").value("my car"));

        verifyNoInteractions(vehicleLookupClient);
    }

    @Test
    @DisplayName("DELETE /api/vehicles/{id} - success - returns 204 and removes vehicle")
    void deleteVehicle_success_returns204() throws Exception {
        mockMvc.perform(delete("/api/vehicles/{id}", vehicle.getId())
                .with(jwtWithRole("auth-sub-123", "DRIVER")))
            .andExpect(status().isNoContent());

        assertThat(vehicleRepository.findById(vehicle.getId())).isEmpty();
    }
}
