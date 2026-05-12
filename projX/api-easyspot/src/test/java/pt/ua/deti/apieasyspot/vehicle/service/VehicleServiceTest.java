package pt.ua.deti.apieasyspot.vehicle.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.common.exception.ConflictException;
import pt.ua.deti.apieasyspot.common.exception.ExternalServiceException;
import pt.ua.deti.apieasyspot.common.exception.PlateNotFoundException;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;
import pt.ua.deti.apieasyspot.common.exception.UnprocessableEntityException;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleCreateRequest;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleData;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleLookupResponse;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleResponse;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleUpdateRequest;
import pt.ua.deti.apieasyspot.vehicle.model.Vehicle;
import pt.ua.deti.apieasyspot.vehicle.repository.VehicleRepository;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;
import static org.assertj.core.api.AssertionsForClassTypes.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VehicleServiceTest {
    @Mock private VehicleRepository vehicleRepository;
    @Mock private UserRepository userRepository;
    @Mock private VehicleLookupClient vehicleLookupClient;
    @Mock private VehiclePhotoStorage vehiclePhotoStorage;
    @Mock private BrandLogoStorage brandLogoStorage;
    @Spy private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private VehicleService vehicleService;

    private User user;
    private Vehicle vehicle;
    private UUID vehicleId;

    @BeforeEach
    void setUp() {
        vehicleId = UUID.randomUUID();

        user = new User();
        user.setId(UUID.randomUUID());
        user.setAuthentikUserId("auth-sub-123");

        vehicle = new Vehicle();
        vehicle.setId(vehicleId);
        vehicle.setUser(user);
        vehicle.setPlate("AA-00-AA");
        vehicle.setMake("Opel");
        vehicle.setModel("Corsa");
        vehicle.setFuelType("Gasolina");
        vehicle.setYear(2021);
    }

    @Test
    @DisplayName("createVehicle - success - calls lookup, mirrors photo and brand logo, saves")
    void createVehicle_success_callsLookupAndMirrorsImages() {
        VehicleCreateRequest request = new VehicleCreateRequest("CC-00-CC", null, null, null, null, null, null, null, null);
        VehicleData data = new VehicleData("CC-00-CC", "VIN123", "Tesla", "Model 3", null, null, null, "Elétrico", null, null, null, null, null, null, null, null, null, null, null);

        when(userRepository.findByAuthentikUserId("auth-sub-123")).thenReturn(Optional.of(user));
        when(vehicleRepository.findByPlate("CC-00-CC")).thenReturn(Optional.empty());
        when(vehicleLookupClient.lookup("CC-00-CC")).thenReturn(data);
        when(brandLogoStorage.mirror("Tesla")).thenReturn("https://r2.example.com/brand-logos/tesla.png");
        when(vehicleRepository.save(any())).thenReturn(vehicle);

        vehicleService.createVehicle("auth-sub-123", request);

        verify(vehicleLookupClient).lookup("CC-00-CC");
        verify(brandLogoStorage).mirror("Tesla");
        verify(vehicleRepository).save(argThat(v ->
            v.getPlate().equals("CC-00-CC") &&
            v.getMake().equals("Tesla") &&
            "https://r2.example.com/brand-logos/tesla.png".equals(v.getBrandLogoUrl())
        ));
    }

    @Test
    @DisplayName("createVehicle - existing plate - throws ConflictException")
    void createVehicle_existingPlate_throwsConflict() {
        VehicleCreateRequest request = new VehicleCreateRequest("AA-00-AA", null, null, null, null, null, null, null, null);

        when(userRepository.findByAuthentikUserId("auth-sub-123")).thenReturn(Optional.of(user));
        when(vehicleRepository.findByPlate("AA-00-AA")).thenReturn(Optional.of(vehicle));

        assertThatThrownBy(() -> vehicleService.createVehicle("auth-sub-123", request))
            .isInstanceOf(ConflictException.class)
            .hasMessageContaining("already exists");
    }

    @Test
    @DisplayName("createVehicle - plate not found, no manual data - throws UnprocessableEntityException")
    void createVehicle_lookupFailure_noManualData_throws() {
        VehicleCreateRequest request = new VehicleCreateRequest("DD-00-DD", null, null, null, null, null, null, null, null);

        when(userRepository.findByAuthentikUserId("auth-sub-123")).thenReturn(Optional.of(user));
        when(vehicleRepository.findByPlate("DD-00-DD")).thenReturn(Optional.empty());
        when(vehicleLookupClient.lookup("DD-00-DD")).thenThrow(new PlateNotFoundException("Not found"));

        assertThatThrownBy(() -> vehicleService.createVehicle("auth-sub-123", request))
            .isInstanceOf(UnprocessableEntityException.class)
            .hasMessageContaining("Please provide");
    }

    @Test
    @DisplayName("createVehicle - external lookup failure, no manual data - propagates ExternalServiceException")
    void createVehicle_externalLookupFailure_noManualData_throwsExternal() {
        VehicleCreateRequest request = new VehicleCreateRequest("EE-00-EE", null, null, null, null, null, null, null, null);

        when(userRepository.findByAuthentikUserId("auth-sub-123")).thenReturn(Optional.of(user));
        when(vehicleRepository.findByPlate("EE-00-EE")).thenReturn(Optional.empty());
        when(vehicleLookupClient.lookup("EE-00-EE")).thenThrow(new ExternalServiceException("Service down"));

        assertThatThrownBy(() -> vehicleService.createVehicle("auth-sub-123", request))
            .isInstanceOf(ExternalServiceException.class)
            .hasMessageContaining("Service down");
    }

    @Test
    @DisplayName("createVehicle - manual data provided - saves without calling lookup, mirrors brand logo")
    void createVehicle_manualData_savesWithoutLookupMirrorsBrandLogo() {
        VehicleCreateRequest request = new VehicleCreateRequest("FR-123-AB", null, null, null, null, "Renault", "Megane", "Gasolina", 2019);

        when(userRepository.findByAuthentikUserId("auth-sub-123")).thenReturn(Optional.of(user));
        when(vehicleRepository.findByPlate("FR-123-AB")).thenReturn(Optional.empty());
        when(brandLogoStorage.mirror("Renault")).thenReturn("https://r2.example.com/brand-logos/renault.png");
        when(vehicleRepository.save(any())).thenReturn(vehicle);

        vehicleService.createVehicle("auth-sub-123", request);

        verify(vehicleLookupClient, never()).lookup(any());
        verify(brandLogoStorage).mirror("Renault");
        verify(vehicleRepository).save(argThat(v ->
            v.getMake().equals("Renault") &&
            v.getModel().equals("Megane") &&
            v.getFuelType().equals("Gasolina") &&
            v.getYear() == 2019 &&
            "https://r2.example.com/brand-logos/renault.png".equals(v.getBrandLogoUrl())
        ));
    }

    @Test
    @DisplayName("createVehicle - unknown brand - brandLogoUrl is null")
    void createVehicle_unknownBrand_brandLogoUrlIsNull() {
        VehicleCreateRequest request = new VehicleCreateRequest("CC-00-CC", null, null, null, null, "UnknownBrand", "X1", "Gasolina", 2020);

        when(userRepository.findByAuthentikUserId("auth-sub-123")).thenReturn(Optional.of(user));
        when(vehicleRepository.findByPlate("CC-00-CC")).thenReturn(Optional.empty());
        when(brandLogoStorage.mirror("UnknownBrand")).thenReturn(null);
        when(vehicleRepository.save(any())).thenReturn(vehicle);

        vehicleService.createVehicle("auth-sub-123", request);

        verify(vehicleRepository).save(argThat(v -> v.getBrandLogoUrl() == null));
    }

    @Test
    @DisplayName("lookupPlate - calls brand logo mirror and returns brandLogoUrl")
    void lookupPlate_mirrorsBrandLogo_returnsBrandLogoUrl() {
        VehicleData data = new VehicleData("AA-00-AA", "VIN123", "Opel", "Corsa", null, 2021, null, "Gasolina", null, null, null, null, null, null, null, null, null, null, null);
        when(vehicleLookupClient.lookup("AA-00-AA")).thenReturn(data);
        when(brandLogoStorage.mirror("Opel")).thenReturn("https://r2.example.com/brand-logos/opel.png");

        VehicleLookupResponse response = vehicleService.lookupPlate("AA-00-AA");

        assertThat(response.brandLogoUrl()).isEqualTo("https://r2.example.com/brand-logos/opel.png");
        verify(brandLogoStorage).mirror("Opel");
    }

    @Test
    @DisplayName("lookupPlate - unknown brand - brandLogoUrl is null in response")
    void lookupPlate_unknownBrand_brandLogoUrlNull() {
        VehicleData data = new VehicleData("AA-00-AA", null, "Lada", "Niva", null, null, null, "Gasolina", null, null, null, null, null, null, null, null, null, null, null);
        when(vehicleLookupClient.lookup("AA-00-AA")).thenReturn(data);
        when(brandLogoStorage.mirror("Lada")).thenReturn(null);

        VehicleLookupResponse response = vehicleService.lookupPlate("AA-00-AA");

        assertThat(response.brandLogoUrl()).isNull();
    }

    @Test
    @DisplayName("updateVehicle - same plate - does not call lookup")
    void updateVehicle_samePlate_doesNotCallLookup() {
        VehicleUpdateRequest request = new VehicleUpdateRequest("AA-00-AA", "my car", false);

        when(userRepository.findByAuthentikUserId("auth-sub-123")).thenReturn(Optional.of(user));
        when(vehicleRepository.findByIdAndUserId(vehicleId, user.getId())).thenReturn(Optional.of(vehicle));
        when(vehicleRepository.save(any())).thenReturn(vehicle);

        VehicleResponse response = vehicleService.updateVehicle("auth-sub-123", vehicleId, request);

        assertThat(response).isNotNull();
        verify(vehicleLookupClient, never()).lookup(any());
    }

    @Test
    @DisplayName("updateVehicle - plate changed - calls lookup and mirrors brand logo")
    void updateVehicle_plateChanged_callsLookupAndMirrorsBrandLogo() {
        VehicleUpdateRequest request = new VehicleUpdateRequest("BB-00-BB", "my car", false);
        VehicleData data = new VehicleData("BB-00-BB", null, "Renault", "Clio", null, null, null, "Gasolina", null, null, null, null, null, null, null, null, null, null, null);

        when(userRepository.findByAuthentikUserId("auth-sub-123")).thenReturn(Optional.of(user));
        when(vehicleRepository.findByIdAndUserId(vehicleId, user.getId())).thenReturn(Optional.of(vehicle));
        when(vehicleLookupClient.lookup("BB-00-BB")).thenReturn(data);
        when(brandLogoStorage.mirror("Renault")).thenReturn("https://r2.example.com/brand-logos/renault.png");
        when(vehicleRepository.save(any())).thenReturn(vehicle);

        vehicleService.updateVehicle("auth-sub-123", vehicleId, request);

        verify(vehicleLookupClient).lookup("BB-00-BB");
        verify(brandLogoStorage).mirror("Renault");
    }

    @Test
    @DisplayName("updateVehicle - user not found - throws ResourceNotFoundException")
    void updateVehicle_userNotFound_throws() {
        when(userRepository.findByAuthentikUserId("auth-sub-123")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> vehicleService.updateVehicle("auth-sub-123", vehicleId, new VehicleUpdateRequest("BB-00-BB", "my car", false)))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("deleteVehicle - vehicle not found - throws ResourceNotFoundException")
    void deleteVehicle_vehicleNotFound_throws() {
        when(userRepository.findByAuthentikUserId("auth-sub-123")).thenReturn(Optional.of(user));
        when(vehicleRepository.findByIdAndUserId(vehicleId, user.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> vehicleService.deleteVehicle("auth-sub-123", vehicleId))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("deleteVehicle - success - calls repository delete")
    void deleteVehicle_success_callsDelete() {
        when(userRepository.findByAuthentikUserId("auth-sub-123")).thenReturn(Optional.of(user));
        when(vehicleRepository.findByIdAndUserId(vehicleId, user.getId())).thenReturn(Optional.of(vehicle));

        vehicleService.deleteVehicle("auth-sub-123", vehicleId);

        verify(vehicleRepository).delete(vehicle);
    }
}
