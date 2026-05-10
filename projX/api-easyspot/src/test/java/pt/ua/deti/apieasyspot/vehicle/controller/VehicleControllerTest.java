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
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleLookupResponse;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleResponse;
import pt.ua.deti.apieasyspot.vehicle.service.VehicleService;

import java.util.List;
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
            vehicleId, "AA-00-AA", "Opel", "Corsa", null, null, 2021, null,
            "Gasolina", null, null, null, null, null, null,
            null, "https://r2.example.com/brand-logos/opel.png",
            "my car", false, false, true
        );
    }

    @Test
    @DisplayName("createVehicle - calls service and returns 200")
    void createVehicle_success() {
        when(jwt.getSubject()).thenReturn("auth-sub-123");
        VehicleCreateRequest request = new VehicleCreateRequest("BB-00-BB", "RFID-1", null, null, null, null, null, null, null, null);
        when(vehicleService.createVehicle("auth-sub-123", request)).thenReturn(vehicleResponse);

        ResponseEntity<VehicleResponse> response = vehicleController.createVehicle(request, jwt);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(vehicleResponse);
        verify(vehicleService).createVehicle("auth-sub-123", request);
    }

    @Test
    @DisplayName("createVehicle - response includes brandLogoUrl")
    void createVehicle_responseIncludesBrandLogoUrl() {
        when(jwt.getSubject()).thenReturn("auth-sub-123");
        VehicleCreateRequest request = new VehicleCreateRequest("BB-00-BB", null, null, null, null, null, null, null, null, null);
        when(vehicleService.createVehicle("auth-sub-123", request)).thenReturn(vehicleResponse);

        ResponseEntity<VehicleResponse> response = vehicleController.createVehicle(request, jwt);

        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().brandLogoUrl()).isEqualTo("https://r2.example.com/brand-logos/opel.png");
    }

    @Test
    @DisplayName("deleteVehicle - calls service and returns 204")
    void deleteVehicle_success() {
        when(jwt.getSubject()).thenReturn("auth-sub-123");
        ResponseEntity<Void> response = vehicleController.deleteVehicle(vehicleId, jwt);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(vehicleService).deleteVehicle("auth-sub-123", vehicleId);
    }

    @Test
    @DisplayName("lookupPlate - calls service and returns 200 with brandLogoUrl")
    void lookupPlate_success_includesBrandLogoUrl() {
        VehicleLookupResponse lookup = new VehicleLookupResponse(
            "AA-00-AA", null, "Opel", "Corsa", null, 2021, null, "Gasolina",
            null, null, null, null, null, null, null,
            "https://r2.example.com/brand-logos/opel.png"
        );
        when(vehicleService.lookupPlate("AA-00-AA")).thenReturn(lookup);

        ResponseEntity<VehicleLookupResponse> response = vehicleController.lookupPlate("AA-00-AA");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().brandLogoUrl()).isEqualTo("https://r2.example.com/brand-logos/opel.png");
        verify(vehicleService).lookupPlate("AA-00-AA");
    }

    @Test
    @DisplayName("lookupPlate - unknown brand - brandLogoUrl is null")
    void lookupPlate_unknownBrand_brandLogoUrlNull() {
        VehicleLookupResponse lookup = new VehicleLookupResponse(
            "AA-00-AA", null, "Lada", "Niva", null, null, null, "Gasolina",
            null, null, null, null, null, null, null, null
        );
        when(vehicleService.lookupPlate("AA-00-AA")).thenReturn(lookup);

        ResponseEntity<VehicleLookupResponse> response = vehicleController.lookupPlate("AA-00-AA");

        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().brandLogoUrl()).isNull();
    }

    @Test
    @DisplayName("listVehicles - calls service and returns 200 with list including brandLogoUrl")
    void listVehicles_success() {
        when(jwt.getSubject()).thenReturn("auth-sub-123");
        when(vehicleService.listVehicles("auth-sub-123")).thenReturn(List.of(vehicleResponse));

        ResponseEntity<List<VehicleResponse>> response = vehicleController.listVehicles(jwt);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsExactly(vehicleResponse);
        assertThat(response.getBody().get(0).brandLogoUrl()).isEqualTo("https://r2.example.com/brand-logos/opel.png");
        verify(vehicleService).listVehicles("auth-sub-123");
    }
}
