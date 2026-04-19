package pt.ua.deti.apieasyspot.vehicle.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import java.util.UUID;
import org.springframework.stereotype.Service;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.common.exception.ConflictException;
import pt.ua.deti.apieasyspot.common.exception.ExternalServiceException;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleCreateRequest;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleData;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleResponse;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleUpdateRequest;
import pt.ua.deti.apieasyspot.vehicle.model.Vehicle;
import pt.ua.deti.apieasyspot.vehicle.repository.VehicleRepository;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class VehicleService {
    private final VehicleRepository vehicleRepository;
    private final UserRepository userRepository;
    private final VehicleLookupClient vehicleLookupClient;
    private final ObjectMapper objectMapper;

    public VehicleResponse createVehicle(String authentikUserId, VehicleCreateRequest request) {
        User user = findUser(authentikUserId);

        if (vehicleRepository.findByPlate(request.licensePlate().toUpperCase()).isPresent()) {
            throw new ConflictException("Vehicle with plate " + request.licensePlate() + " already exists");
        }

        Vehicle vehicle = new Vehicle();
        vehicle.setUser(user);
        vehicle.setPlate(request.licensePlate().toUpperCase());
        vehicle.setRfid(request.externalIdentifier());
        
        // Default values that are @NotBlank in the entity
        vehicle.setMake("Unknown");
        vehicle.setModel("Unknown");
        vehicle.setFuelType("Unknown");
        vehicle.setYear(LocalDateTime.now().getYear());

        try {
            VehicleData data = vehicleLookupClient.lookup(vehicle.getPlate());
            if (data != null) {
                applyLookupData(vehicle, data);
            }
        } catch (ExternalServiceException e) {
            // Graceful handling: we still create the vehicle even if lookup fails
        }

        return toResponse(vehicleRepository.save(vehicle));
    }

    public VehicleResponse updateVehicle(String authentikUserId, UUID vehicleId, VehicleUpdateRequest request){
        User user = findUser(authentikUserId);
        Vehicle vehicle = findVehicle(vehicleId, user.getId());

        if(!vehicle.getPlate().equalsIgnoreCase(request.plate())){
            VehicleData data = vehicleLookupClient.lookup(request.plate());
            applyLookupData(vehicle, data);
        }

        vehicle.setPlate(request.plate().toUpperCase());
        vehicle.setNickname(request.nickname());
        vehicle.setPrimary(request.isPrimary());

        return toResponse(vehicleRepository.save(vehicle));
    }

    public void deleteVehicle(String authentikUserId, UUID vehicleId){
        User user = findUser(authentikUserId);
        Vehicle vehicle = findVehicle(vehicleId, user.getId());
        vehicleRepository.delete(vehicle);
    }

    private User findUser(String authentikUserId){
        return userRepository.findByAuthentikUserId(authentikUserId).orElseThrow(() -> new ResourceNotFoundException("User not found: " + authentikUserId));
    }

    private Vehicle findVehicle(UUID vehicleId, UUID userId){
        return vehicleRepository.findByIdAndUserId(vehicleId, userId).orElseThrow(() -> new ResourceNotFoundException("Vehicle not found: " + vehicleId));
    }

    private void applyLookupData(Vehicle vehicle, VehicleData data){
        vehicle.setMake(data.make());
        vehicle.setModel(data.model());
        vehicle.setVersion(data.version());
        vehicle.setColor(data.color());
        vehicle.setFuelType(data.fuelType());
        vehicle.setVin(data.vin());
        vehicle.setEv("Elétrico".equalsIgnoreCase(data.fuelType()));
        vehicle.setLastSyncedAt(LocalDateTime.now());
        try {
            vehicle.setSyncedDataJson(objectMapper.writeValueAsString(data));
        } catch (JsonProcessingException e) {
            throw new ExternalServiceException("Failed to serialize vehicle lookup data", e);
        }
    }

    private VehicleResponse toResponse(Vehicle vehicle){
        return new VehicleResponse(
            vehicle.getId(),
            vehicle.getPlate(),
            vehicle.getMake(),
            vehicle.getModel(),
            vehicle.getVersion(),
            vehicle.getColor(),
            vehicle.getYear(),
            vehicle.getFuelType(),
            vehicle.getPowerKW(),
            vehicle.getNickname(),
            vehicle.isEv(),
            vehicle.isAccessible(),
            vehicle.isPrimary()
        );
    }
}
