package pt.ua.deti.apieasyspot.vehicle.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.common.exception.ConflictException;
import pt.ua.deti.apieasyspot.common.exception.PlateNotFoundException;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;
import pt.ua.deti.apieasyspot.common.exception.UnprocessableEntityException;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleCapabilities;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleLookupResponse;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleCreateRequest;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleData;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleResponse;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleUpdateRequest;
import pt.ua.deti.apieasyspot.vehicle.model.Vehicle;
import pt.ua.deti.apieasyspot.vehicle.repository.VehicleRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class VehicleService {
    private static final Logger log = LoggerFactory.getLogger(VehicleService.class);
    private static final String UNKNOWN = "DESCONHECIDO";

    private final VehicleRepository vehicleRepository;
    private final UserRepository userRepository;
    private final VehicleLookupClient vehicleLookupClient;
    private final VehiclePhotoStorage vehiclePhotoStorage;
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
        vehicle.setNickname(request.nickname());
        vehicle.setAccessible(Boolean.TRUE.equals(request.isAccessible()));
        vehicle.setPrimary(resolvePrimaryFlag(user.getId(), request.isPrimary()));
        vehicle.setChargerTypesJson(serialiseSafely(request.chargerTypes()));

        log.info(
            "Creating vehicle plate={} hasManualData={}",
            plate, request.hasManualData()
        );

        if (request.hasManualData()) {
            applyManualData(vehicle, request);
        } else {
            try {
                applyLookupData(vehicle, vehicleLookupClient.lookup(plate));
            } catch (PlateNotFoundException ex) {
                throw new UnprocessableEntityException(
                    "Plate not found in the registry. Please provide: make, model, fuelType, year."
                );
            }
        }

        return toResponse(vehicleRepository.save(vehicle));
    }

    public VehicleResponse updateVehicle(String authentikUserId, UUID vehicleId, VehicleUpdateRequest request) {
        User user = findUser(authentikUserId);
        Vehicle vehicle = findVehicle(vehicleId, user.getId());

        if (!vehicle.getPlate().equalsIgnoreCase(request.plate())) {
            VehicleData data = vehicleLookupClient.lookup(request.plate());
            applyLookupData(vehicle, data);
        }

        vehicle.setPlate(request.plate().toUpperCase());
        vehicle.setNickname(request.nickname());
        vehicle.setPrimary(request.isPrimary());

        return toResponse(vehicleRepository.save(vehicle));
    }

    public java.util.List<VehicleResponse> listVehicles(String authentikUserId) {
        User user = findUser(authentikUserId);
        return vehicleRepository.findByUserId(user.getId()).stream()
            .map(this::toResponse)
            .toList();
    }

    public void deleteVehicle(String authentikUserId, UUID vehicleId) {
        User user = findUser(authentikUserId);
        Vehicle vehicle = findVehicle(vehicleId, user.getId());
        vehicleRepository.delete(vehicle);
    }

    private User findUser(String authentikUserId) {
        return userRepository.findByAuthentikUserId(authentikUserId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + authentikUserId));
    }

    private Vehicle findVehicle(UUID vehicleId, UUID userId) {
        return vehicleRepository.findByIdAndUserId(vehicleId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found: " + vehicleId));
    }

    private void applyLookupData(Vehicle vehicle, VehicleData data) {
        vehicle.setMake(nullSafe(data.make(), UNKNOWN));
        vehicle.setModel(nullSafe(data.model(), UNKNOWN));
        vehicle.setVersion(data.version());
        vehicle.setFuelType(nullSafe(data.fuelType(), UNKNOWN));
        vehicle.setVin(data.vin());
        vehicle.setEv(isElectric(data.fuelType()));
        vehicle.setYear(resolveYear(data.yearFrom()));
        vehicle.setYearTo(data.yearTo());
        vehicle.setPowerKW(data.powerKw());
        vehicle.setPowerCV(data.powerCv());
        vehicle.setDisplacementCc(data.displacementCc());
        vehicle.setCylinders(data.cylinders());
        vehicle.setBodyType(data.bodyType());
        vehicle.setDriveType(data.driveType());
        vehicle.setEngineCode(data.engineCode());
        vehicle.setEngineType(data.engineType());
        vehicle.setExternalSourceId(data.externalSourceId());
        vehicle.setLastSyncedAt(LocalDateTime.now());
        vehicle.setSyncedDataJson(serialiseSafely(data));
        vehicle.setImageUrl(mirrorPhoto(data));
    }

    private String mirrorPhoto(VehicleData data) {
        if (data.externalSourceId() == null && data.imageUrl() == null) return null;
        return vehiclePhotoStorage.mirror(data.externalSourceId(), data.imageUrl());
    }

    private boolean isElectric(String fuelType) {
        if (fuelType == null) return false;
        String normalised = fuelType.toLowerCase();
        return normalised.contains("eléct") || normalised.contains("elect")
            || normalised.contains("elétr") || normalised.contains("eletr")
            || normalised.contains("ev");
    }

    private int resolveYear(Integer yearFrom) {
        if (yearFrom != null && yearFrom >= 1900 && yearFrom <= 2100) return yearFrom;
        return LocalDate.now().getYear();
    }

    private void applyManualData(Vehicle vehicle, VehicleCreateRequest request) {
        vehicle.setMake(request.make());
        vehicle.setModel(request.model());
        vehicle.setFuelType(request.fuelType());
        vehicle.setYear(request.year());
        vehicle.setEv(isElectric(request.fuelType()));
    }

    private boolean resolvePrimaryFlag(UUID userId, Boolean requestedPrimary) {
        if (Boolean.TRUE.equals(requestedPrimary)) return true;
        return vehicleRepository.findByUserId(userId).isEmpty();
    }

    public VehicleLookupResponse lookupPlate(String plate) {
        VehicleData data = vehicleLookupClient.lookup(plate.toUpperCase());
        return new VehicleLookupResponse(
            plate.toUpperCase(),
            data.vin(),
            data.make(),
            data.model(),
            data.version(),
            data.yearFrom(),
            data.yearTo(),
            data.fuelType(),
            data.powerKw(),
            data.powerCv(),
            data.displacementCc(),
            data.bodyType(),
            data.driveType(),
            data.engineCode(),
            data.imageUrl()
        );
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
            vehicle.getYearTo(),
            vehicle.getFuelType(),
            vehicle.getPowerKW(),
            vehicle.getPowerCV(),
            vehicle.getDisplacementCc(),
            vehicle.getBodyType(),
            vehicle.getDriveType(),
            vehicle.getEngineCode(),
            vehicle.getImageUrl(),
            vehicle.getNickname(),
            vehicle.isEv(),
            vehicle.isAccessible(),
            vehicle.isPrimary()
        );
    }

    private static String nullSafe(String value, String fallback) {
        return (value == null || value.isBlank()) ? fallback : value;
    }

    private String serialiseSafely(VehicleData data) {
        try {
            return objectMapper.writeValueAsString(data);
        } catch (Exception ex) {
            log.warn("Could not serialise VehicleData plate={}", data.plate(), ex);
            return null;
        }
    }

    private String serialiseSafely(List<String> values) {
        if (values == null || values.isEmpty()) return null;
        try {
            return objectMapper.writeValueAsString(values);
        } catch (Exception ex) {
            log.warn("Could not serialise charger types {}", values, ex);
            return null;
        }
    }
}
