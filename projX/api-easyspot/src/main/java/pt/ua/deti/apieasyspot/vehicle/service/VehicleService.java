package pt.ua.deti.apieasyspot.vehicle.service;

import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import java.util.UUID;
import org.springframework.stereotype.Service;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.common.exception.ConflictException;
import pt.ua.deti.apieasyspot.common.exception.ExternalServiceException;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;
import pt.ua.deti.apieasyspot.common.exception.UnprocessableEntityException;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleCapabilities;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleCreateRequest;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleData;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleResponse;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleUpdateRequest;
import pt.ua.deti.apieasyspot.vehicle.model.Vehicle;
import pt.ua.deti.apieasyspot.vehicle.repository.VehicleRepository;

import java.time.LocalDate;
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
        String plate = request.licensePlate().toUpperCase();

        if (vehicleRepository.findByPlate(plate).isPresent())
            throw new ConflictException("Vehicle with plate " + plate + " already exists");

        Vehicle vehicle = new Vehicle();
        vehicle.setUser(user);
        vehicle.setPlate(plate);
        vehicle.setRfid(request.externalIdentifier());

        if (request.hasManualData()) {
            applyManualData(vehicle, request);
        } else {
            try {
                applyLookupData(vehicle, vehicleLookupClient.lookup(plate));
            } catch (ExternalServiceException ex) {
                throw new UnprocessableEntityException(
                    "Plate not found in the registry. Please provide: make, model, fuelType, year."
                );
            }
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

    private void applyLookupData(Vehicle vehicle, VehicleData data) {
        vehicle.setMake(data.make());
        vehicle.setModel(data.model());
        vehicle.setVersion(data.version());
        vehicle.setColor(data.color());
        vehicle.setFuelType(data.fuelType());
        vehicle.setVin(data.vin());
        vehicle.setEv("Elétrico".equalsIgnoreCase(data.fuelType()));
        vehicle.setYear(parseYear(data.plateDate()));
        vehicle.setLastSyncedAt(LocalDateTime.now());
        vehicle.setSyncedDataJson(objectMapper.writeValueAsString(data));
    }

    private void applyManualData(Vehicle vehicle, VehicleCreateRequest request) {
        vehicle.setMake(request.make());
        vehicle.setModel(request.model());
        vehicle.setFuelType(request.fuelType());
        vehicle.setYear(request.year());
        vehicle.setEv("Elétrico".equalsIgnoreCase(request.fuelType()));
    }

    private int parseYear(String plateDate) {
        if (plateDate == null || plateDate.isBlank()) return LocalDate.now().getYear();
        try {
            int year = Integer.parseInt(plateDate.substring(0, 4));
            if (year >= 1900 && year <= 2100) return year;
        } catch (NumberFormatException ignored) {}
        try {
            int year = Integer.parseInt(plateDate.substring(plateDate.length() - 4));
            if (year >= 1900 && year <= 2100) return year;
        } catch (NumberFormatException ignored) {}
        return LocalDate.now().getYear();
    }

    public VehicleCapabilities getCapabilities(UUID vehicleId) {
        return vehicleRepository.findById(vehicleId)
            .map(v -> new VehicleCapabilities(v.isEv(), v.isAccessible()))
            .orElse(new VehicleCapabilities(false, false));
    }

    private VehicleResponse toResponse(Vehicle vehicle) {
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
