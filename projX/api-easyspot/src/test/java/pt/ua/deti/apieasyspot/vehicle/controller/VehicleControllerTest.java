package pt.ua.deti.apieasyspot.vehicle.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleCreateRequest;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleResponse;
import pt.ua.deti.apieasyspot.vehicle.service.VehicleService;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VehicleControllerTest {

    @Mock private VehicleService vehicleService;
    @Mock private Jwt jwt;

    @InjectMocks
    private VehicleController vehicleController;

    private VehicleResponse vehicleResponse;
    private UUID vehicleId;

    @BeforeEach
    void setUp() {
        vehicleId = UUID.randomUUID();
        vehicleResponse = new VehicleResponse(
            vehicleId, "AA-00-AA", "Opel", "Corsa", null, null, 2021, null, "Gasolina", null, null, null, null, null, null, null, "my car", false, false, true
        );
        
        when(jwt.getSubject()).thenReturn("auth-sub-123");
    }

    @Test
    @DisplayName("createVehicle - calls service and returns 200")
    void createVehicle_success() {
        VehicleCreateRequest request = new VehicleCreateRequest("BB-00-BB", "RFID-1", null, null, null, null, null, null, null, null);
        when(vehicleService.createVehicle("auth-sub-123", request)).thenReturn(vehicleResponse);

        ResponseEntity<VehicleResponse> response = vehicleController.createVehicle(request, jwt);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(vehicleResponse);
        verify(vehicleService).createVehicle("auth-sub-123", request);
    }

    @Test
    @DisplayName("deleteVehicle - calls service and returns 204")
    void deleteVehicle_success() {
        ResponseEntity<Void> response = vehicleController.deleteVehicle(vehicleId, jwt);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(vehicleService).deleteVehicle("auth-sub-123", vehicleId);
    }
}
