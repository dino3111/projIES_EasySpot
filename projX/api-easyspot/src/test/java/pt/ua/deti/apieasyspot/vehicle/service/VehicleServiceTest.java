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
public class VehicleServiceTest {
    @Mock private VehicleRepository vehicleRepository;
    @Mock private UserRepository userRepository;
    @Mock private VehicleLookupClient vehicleLookupClient;
    @Spy private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private VehicleService vehicleService;

    private User user;
    private Vehicle vehicle;
    private UUID vehicleId;

    @BeforeEach
    void setUp(){
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
    @DisplayName("createVehicle - success - calls lookup and saves")
    void createVehicle_success_callsLookup() {
        VehicleCreateRequest request = new VehicleCreateRequest("CC-00-CC", "rfid-123", null, null, null, null, null, null, null, null);
        VehicleData data = new VehicleData("CC-00-CC", "VIN123", "Tesla", "Model 3", null, null, null, "Elétrico", null, null, null, null, null, null, null, null, null, null, null);

        when(userRepository.findByAuthentikUserId("auth-sub-123")).thenReturn(Optional.of(user));
        when(vehicleRepository.findByPlate("CC-00-CC")).thenReturn(Optional.empty());
        when(vehicleLookupClient.lookup("CC-00-CC")).thenReturn(data);
        when(vehicleRepository.save(any())).thenReturn(vehicle);

        vehicleService.createVehicle("auth-sub-123", request);

        verify(vehicleLookupClient).lookup("CC-00-CC");
        verify(vehicleRepository).save(argThat(v ->
            v.getPlate().equals("CC-00-CC") &&
            v.getMake().equals("Tesla") &&
            v.getRfid().equals("rfid-123")
        ));
    }

    @Test
    @DisplayName("createVehicle - existing plate - throws ConflictException")
    void createVehicle_existingPlate_throwsConflict() {
        VehicleCreateRequest request = new VehicleCreateRequest("AA-00-AA", null, null, null, null, null, null, null, null, null);

        when(userRepository.findByAuthentikUserId("auth-sub-123")).thenReturn(Optional.of(user));
        when(vehicleRepository.findByPlate("AA-00-AA")).thenReturn(Optional.of(vehicle));

        assertThatThrownBy(() -> vehicleService.createVehicle("auth-sub-123", request))
            .isInstanceOf(ConflictException.class)
            .hasMessageContaining("already exists");
    }

    @Test
    @DisplayName("createVehicle - plate not found, no manual data - throws UnprocessableEntityException")
    void createVehicle_lookupFailure_noManualData_throws() {
        VehicleCreateRequest request = new VehicleCreateRequest("DD-00-DD", null, null, null, null, null, null, null, null, null);

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
        VehicleCreateRequest request = new VehicleCreateRequest("EE-00-EE", null, null, null, null, null, null, null, null, null);

        when(userRepository.findByAuthentikUserId("auth-sub-123")).thenReturn(Optional.of(user));
        when(vehicleRepository.findByPlate("EE-00-EE")).thenReturn(Optional.empty());
        when(vehicleLookupClient.lookup("EE-00-EE")).thenThrow(new ExternalServiceException("Service down"));

        assertThatThrownBy(() -> vehicleService.createVehicle("auth-sub-123", request))
            .isInstanceOf(ExternalServiceException.class)
            .hasMessageContaining("Service down");
    }

    @Test
    @DisplayName("createVehicle - manual data provided - saves without calling lookup")
    void createVehicle_manualData_savesWithoutLookup() {
        VehicleCreateRequest request = new VehicleCreateRequest("FR-123-AB", null, null, null, null, null, "Renault", "Megane", "Gasolina", 2019);

        when(userRepository.findByAuthentikUserId("auth-sub-123")).thenReturn(Optional.of(user));
        when(vehicleRepository.findByPlate("FR-123-AB")).thenReturn(Optional.empty());
        when(vehicleRepository.save(any())).thenReturn(vehicle);

        vehicleService.createVehicle("auth-sub-123", request);

        verify(vehicleLookupClient, never()).lookup(any());
        verify(vehicleRepository).save(argThat(v ->
            v.getMake().equals("Renault") &&
            v.getModel().equals("Megane") &&
            v.getFuelType().equals("Gasolina") &&
            v.getYear() == 2019
        ));
    }

    @Test
    @DisplayName("updateVehicle - same plate - does not call lookup")
    void updateVehicle_samePlate_doesNotCallLookup(){
        VehicleUpdateRequest request = new VehicleUpdateRequest("AA-00-AA", "my car", false);

        when(userRepository.findByAuthentikUserId("auth-sub-123")).thenReturn(Optional.of(user));
        when(vehicleRepository.findByIdAndUserId(vehicleId, user.getId())).thenReturn(Optional.of(vehicle));
        when(vehicleRepository.save(any())).thenReturn(vehicle);

        VehicleResponse response = vehicleService.updateVehicle("auth-sub-123", vehicleId, request);

        assertThat(response).isNotNull();
        verify(vehicleLookupClient, never()).lookup(any());
    }

    @Test
    @DisplayName("updateVehicle - plate changed - calls lookup")
    void updateVehicle_plateChanged_callsLookup(){
        VehicleUpdateRequest request = new VehicleUpdateRequest("BB-00-BB", "my car", false);
        VehicleData data = new VehicleData("BB-00-BB", null, "Renault", "Clio", null, null, null, "Gasolina", null, null, null, null, null, null, null, null, null, null, null);

        when(userRepository.findByAuthentikUserId("auth-sub-123")).thenReturn(Optional.of(user));
        when(vehicleRepository.findByIdAndUserId(vehicleId, user.getId())).thenReturn(Optional.of(vehicle));
        when(vehicleLookupClient.lookup("BB-00-BB")).thenReturn(data);
        when(vehicleRepository.save(any())).thenReturn(vehicle);

        vehicleService.updateVehicle("auth-sub-123", vehicleId, request);

        verify(vehicleLookupClient).lookup("BB-00-BB");
    }

    @Test
    @DisplayName("updateVehicle - user not found - throws ResourceNotFoundException")
    void updateVehicle_userNotFound_throws(){
        when(userRepository.findByAuthentikUserId("auth-sub-123")).thenReturn(Optional.empty());

        assertThatThrownBy(()-> vehicleService.updateVehicle("auth-sub-123", vehicleId, new VehicleUpdateRequest("BB-00-BB", "my car", false)))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("delete vehicle - vehicle not found - throws ResourceNotFoundException")
    void deleteVehicle_vehicleNotFound_throws(){
        when(userRepository.findByAuthentikUserId("auth-sub-123")).thenReturn(Optional.of(user));
        when(vehicleRepository.findByIdAndUserId(vehicleId, user.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(()-> vehicleService.deleteVehicle("auth-sub-123", vehicleId))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("delete vehicle - success - calls repository delete")
    void deleteVehicle_success_callsDelete(){
        when(userRepository.findByAuthentikUserId("auth-sub-123")).thenReturn(Optional.of(user));
        when(vehicleRepository.findByIdAndUserId(vehicleId, user.getId())).thenReturn(Optional.of(vehicle));

        vehicleService.deleteVehicle("auth-sub-123", vehicleId);

        verify(vehicleRepository).delete(vehicle);
    }
}
