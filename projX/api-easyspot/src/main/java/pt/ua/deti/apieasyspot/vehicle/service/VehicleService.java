package pt.ua.deti.apieasyspot.vehicle.service;

import tools.jackson.databind.ObjectMapper;
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
import pt.ua.deti.apieasyspot.vehicle.dto.InsuranceData;
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

@Service
@RequiredArgsConstructor
public class VehicleService {
    private static final Logger log = LoggerFactory.getLogger(VehicleService.class);

    private final VehicleRepository vehicleRepository;
    private final UserRepository userRepository;
    private final VehicleLookupClient vehicleLookupClient;
    private final ObjectMapper objectMapper;

    public VehicleResponse createVehicle(String authentikUserId, VehicleCreateRequest request, String appCheckToken) {
        User user = findUser(authentikUserId);
        String plate = request.licensePlate().toUpperCase();

        if (vehicleRepository.findByPlate(plate).isPresent())
            throw new ConflictException("Vehicle with plate " + plate + " already exists");

        Vehicle vehicle = new Vehicle();
        vehicle.setUser(user);
        vehicle.setPlate(plate);
        vehicle.setRfid(request.externalIdentifier());

        log.info(
            "Creating vehicle plate={} hasManualData={} makePresent={} modelPresent={} fuelTypePresent={} yearPresent={}",
            plate,
            request.hasManualData(),
            request.make() != null && !request.make().isBlank(),
            request.model() != null && !request.model().isBlank(),
            request.fuelType() != null && !request.fuelType().isBlank(),
            request.year() != null
        );

        if (request.hasManualData()) {
            log.info("Persisting vehicle plate={} with client-provided data, skipping InfoMatricula backend lookup", plate);
            applyManualData(vehicle, request);
        } else {
            try {
                log.info("No complete client-provided data for plate={}, attempting InfoMatricula backend lookup", plate);
                applyLookupData(vehicle, vehicleLookupClient.lookup(plate, appCheckToken));
            } catch (PlateNotFoundException ex) {
                throw new UnprocessableEntityException(
                    "Plate not found in the registry. Please provide: make, model, fuelType, year."
                );
            }
        }

        return toResponse(vehicleRepository.save(vehicle));
    }

    public VehicleResponse updateVehicle(String authentikUserId, UUID vehicleId, VehicleUpdateRequest request, String appCheckToken){
        User user = findUser(authentikUserId);
        Vehicle vehicle = findVehicle(vehicleId, user.getId());

        if(!vehicle.getPlate().equalsIgnoreCase(request.plate())){
            VehicleData data = vehicleLookupClient.lookup(request.plate(), appCheckToken);
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

    public VehicleLookupResponse lookupPlate(String plate, String appCheckToken) {
        VehicleData data = vehicleLookupClient.lookup(plate.toUpperCase(), appCheckToken);
        return new VehicleLookupResponse(
            plate.toUpperCase(),
            data.make(),
            data.model(),
            data.version(),
            data.color(),
            data.fuelType(),
            data.plateDate(),
            data.categoryType(),
            data.vin()
        );
    }

    public InsuranceData lookupInsurance(String plate, String appCheckToken) {
        return vehicleLookupClient.lookupInsurance(plate.toUpperCase(), appCheckToken);
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
