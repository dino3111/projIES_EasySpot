package pt.ua.deti.apieasyspot.occupancy.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.auth.service.AuthentikClient;
import pt.ua.deti.apieasyspot.analytics.service.TechnicianParkAssignmentService;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;
import pt.ua.deti.apieasyspot.occupancy.dto.*;
import pt.ua.deti.apieasyspot.occupancy.model.AccessibleSpot;
import pt.ua.deti.apieasyspot.occupancy.model.EVCharger;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingSpot;
import pt.ua.deti.apieasyspot.occupancy.model.ParkStatus;
import pt.ua.deti.apieasyspot.occupancy.model.ZoneType;
import pt.ua.deti.apieasyspot.occupancy.repository.AccessibleSpotRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.EVChargerRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingSpotRepository;
import pt.ua.deti.apieasyspot.occupancy.model.TechnicianParkAssignment;
import pt.ua.deti.apieasyspot.occupancy.repository.TechnicianParkAssignmentRepository;
import pt.ua.deti.apieasyspot.sensor.model.SensorRegistry;
import pt.ua.deti.apieasyspot.sensor.model.SensorStatus;
import pt.ua.deti.apieasyspot.sensor.repository.SensorRegistryRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ManagerParkService {

    private final UserRepository userRepository;
    private final ParkingLotRepository parkingLotRepository;
    private final ParkingSpotRepository parkingSpotRepository;
    private final EVChargerRepository evChargerRepository;
    private final AccessibleSpotRepository accessibleSpotRepository;
    private final TechnicianParkAssignmentRepository assignmentRepository;
    private final SensorRegistryRepository sensorRegistryRepository;
    private final TechnicianParkAssignmentService analyticsAssignmentService;
    private final AuthentikClient authentikClient;

    public List<TechnicianSummaryResponse> listTechnicians() {
        return userRepository.findByRoleOrderByNameAsc("TECHNICAL").stream()
            .map(u -> new TechnicianSummaryResponse(u.getId(), u.getName(), u.getEmail()))
            .toList();
    }

    public List<ParkAssignmentsResponse> listParkAssignments() {
        List<TechnicianParkAssignmentRepository.AssignmentRow> all = assignmentRepository.findAllAssignmentRows();
        Map<UUID, List<UUID>> byPark = new HashMap<>();
        for (TechnicianParkAssignmentRepository.AssignmentRow a : all) {
            byPark.computeIfAbsent(a.getParkingLotId(), k -> new ArrayList<>()).add(a.getTechnicianId());
        }
        Map<UUID, User> techById = userRepository.findByRole("TECHNICAL").stream()
            .collect(Collectors.toMap(User::getId, u -> u));

        return byPark.entrySet().stream().map(e -> new ParkAssignmentsResponse(
            e.getKey(),
            e.getValue().stream()
                .filter(techById::containsKey)
                .map(tid -> new TechnicianSummaryResponse(tid, techById.get(tid).getName(), techById.get(tid).getEmail()))
                .toList()
        )).toList();
    }

    @Transactional
    public TechnicianDetailResponse createTechnician(CreateTechnicianRequest req) {
        String groupPk = authentikClient.findGroupPk("TECHNICAL");
        AuthentikClient.AuthentikUser akUser = authentikClient.createUser(
            req.username(), req.name(), req.email(), groupPk
        );
        authentikClient.setPassword(akUser.pk(), req.temporaryPassword(), true);

        User user = new User();
        user.setAuthentikUserId(akUser.uid());
        user.setAuthentikPk(akUser.pk());
        user.setEmail(req.email());
        user.setName(req.name());
        user.setRole("TECHNICAL");
        User saved = userRepository.save(user);

        List<UUID> parkIds = req.parkIds() != null ? req.parkIds() : List.of();
        for (UUID parkId : parkIds) {
            ParkingLot lot = parkingLotRepository.findById(parkId)
                .orElseThrow(() -> new ResourceNotFoundException("Park not found: " + parkId));
            assignmentRepository.deleteByParkingLotId(parkId);
            TechnicianParkAssignment assignment = new TechnicianParkAssignment();
            assignment.setTechnicianId(saved.getId());
            assignment.setParkingLotId(lot.getId());
            assignmentRepository.save(assignment);
            analyticsAssignmentService.assign(saved.getId(), lot.getId());
        }

        return new TechnicianDetailResponse(saved.getId(), saved.getName(), saved.getEmail(), req.username(), parkIds);
    }

    @Transactional
    public void assignTechnicianToPark(UUID parkId, UUID technicianId) {
        ParkingLot lot = parkingLotRepository.findById(parkId)
            .orElseThrow(() -> new ResourceNotFoundException("Park not found: " + parkId));
        userRepository.findById(technicianId)
            .orElseThrow(() -> new ResourceNotFoundException("Technician not found: " + technicianId));

        assignmentRepository.deleteByParkingLotId(parkId);
        TechnicianParkAssignment assignment = new TechnicianParkAssignment();
        assignment.setTechnicianId(technicianId);
        assignment.setParkingLotId(lot.getId());
        assignmentRepository.save(assignment);
        analyticsAssignmentService.assign(technicianId, lot.getId());
    }

    @Transactional
    public void removeTechnicianFromPark(UUID parkId, UUID technicianId) {
        assignmentRepository.deleteByParkingLotIdAndTechnicianId(parkId, technicianId);
        analyticsAssignmentService.unassign(technicianId, parkId);
    }

    public List<ManagerParkSummaryResponse> listAllParks() {
        return parkingLotRepository.findAllByOrderByNameAsc().stream()
            .map(lot -> new ManagerParkSummaryResponse(
                lot.getId(), lot.getName(), lot.getCity(), lot.getAddress(),
                lot.getLatitude(), lot.getLongitude(), lot.getOpeningHours(),
                lot.getTotalSpaces(), lot.getStatus()))
            .toList();
    }

    @Transactional
    public ManagerParkSummaryResponse updateParkStatus(UUID parkId, ParkStatus newStatus) {
        ParkingLot lot = parkingLotRepository.findById(parkId)
            .orElseThrow(() -> new ResourceNotFoundException("Park not found: " + parkId));
        lot.setStatus(newStatus);
        ParkingLot saved = parkingLotRepository.save(lot);
        return new ManagerParkSummaryResponse(
            saved.getId(), saved.getName(), saved.getCity(), saved.getAddress(),
            saved.getLatitude(), saved.getLongitude(), saved.getOpeningHours(),
            saved.getTotalSpaces(), saved.getStatus());
    }

    @Transactional
    public ParkingLot createPark(CreateParkRequest req) {
        if (req.technicianId() != null) {
            userRepository.findById(req.technicianId())
                .orElseThrow(() -> new ResourceNotFoundException("Technician not found: " + req.technicianId()));
        }

        ParkingLot lot = new ParkingLot();
        lot.setName(req.name());
        lot.setCity(req.city());
        lot.setAddress(req.address());
        lot.setLatitude(req.latitude());
        lot.setLongitude(req.longitude());
        lot.setOpeningHours(req.openingHours());
        lot.setTotalSpaces(req.totalSpaces());
        lot.setAmenities(new java.util.ArrayList<>());
        ParkingLot saved = parkingLotRepository.save(lot);
        createDefaultSpotsAndSensors(saved, req.totalSpaces());
        createDefaultOcrCameras(saved);

        if (req.technicianId() != null) {
            TechnicianParkAssignment assignment = new TechnicianParkAssignment();
            assignment.setTechnicianId(req.technicianId());
            assignment.setParkingLotId(saved.getId());
            assignmentRepository.save(assignment);
            analyticsAssignmentService.assign(req.technicianId(), saved.getId());
        }

        return saved;
    }

    @Transactional
    public ParkingLot configureParkLayout(UUID parkId, ConfigureParkLayoutRequest req) {
        ParkingLot lot = parkingLotRepository.findById(parkId)
            .orElseThrow(() -> new ResourceNotFoundException("Park not found: " + parkId));

        parkingSpotRepository.deleteByParkingLotId(parkId);
        sensorRegistryRepository.deleteAllByParkingLotId(parkId);
        evChargerRepository.deleteByParkingLotId(parkId);
        accessibleSpotRepository.deleteByParkingLotId(parkId);

        List<String> normalizedAmenities = normalizeAmenities(req.amenities());
        lot.setAmenities(new ArrayList<>(normalizedAmenities));

        List<ConfigureParkLayoutRequest.ParkingSpotSeedRequest> spotSeeds =
            req.spots() != null ? req.spots() : List.of();
        if (!spotSeeds.isEmpty()) {
            lot.setTotalSpaces(spotSeeds.size());
        }
        ParkingLot savedLot = parkingLotRepository.save(lot);

        if (!spotSeeds.isEmpty()) {
            List<ParkingSpot> spots = spotSeeds.stream().map(seed -> {
                ParkingSpot spot = new ParkingSpot();
                spot.setParkingLot(savedLot);
                spot.setSpotNumber(requireTrimmed(seed.spotNumber(), "spotNumber", 20));
                ZoneType zone = parseZone(seed.zone());
                spot.setZone(zone);
                spot.setSpotRow(seed.row());
                spot.setSpotCol(seed.col());
                spot.setStatus(resolveStatus(seed.status(), zone));
                return spot;
            }).toList();
            List<ParkingSpot> savedSpots = parkingSpotRepository.saveAll(spots);
            createSensorsForSpots(savedLot, savedSpots);
            createDefaultOcrCameras(savedLot);
        }

        List<ConfigureParkLayoutRequest.EvChargerSeedRequest> chargerSeeds =
            req.evChargers() != null ? req.evChargers() : List.of();
        if (!chargerSeeds.isEmpty()) {
            List<EVCharger> chargers = chargerSeeds.stream().map(seed -> {
                EVCharger charger = new EVCharger();
                charger.setParkingLot(savedLot);
                charger.setType(requireTrimmed(seed.type(), "evChargers.type", 50));
                charger.setSpeed(requireTrimmed(seed.speed(), "evChargers.speed", 50));
                charger.setPricePerKwh(seed.pricePerKwh() != null ? seed.pricePerKwh() : BigDecimal.ZERO);
                charger.setAvailable(seed.available() == null || seed.available());
                return charger;
            }).toList();
            evChargerRepository.saveAll(chargers);
        }

        List<ConfigureParkLayoutRequest.AccessibleSpotSeedRequest> accSeeds =
            req.accessibleSpots() != null ? req.accessibleSpots() : List.of();
        if (!accSeeds.isEmpty()) {
            List<AccessibleSpot> accessibleSpots = accSeeds.stream().map(seed -> {
                AccessibleSpot spot = new AccessibleSpot();
                spot.setParkingLot(savedLot);
                spot.setLocation(requireTrimmed(seed.location(), "accessibleSpots.location", 100));
                spot.setAvailable(seed.available() == null || seed.available());
                spot.setDistanceToEntranceMeters(seed.distanceToEntranceMeters() != null ? seed.distanceToEntranceMeters() : 0);
                spot.setBaySize(optionalTrimmed(seed.baySize(), 50, "accessibleSpots.baySize", "3.5m x 5.0m"));
                spot.setMonitored(seed.monitored() != null && seed.monitored());
                spot.setHasRampSpace(seed.hasRampSpace() != null && seed.hasRampSpace());
                spot.setSensorStatus(optionalTrimmed(seed.sensorStatus(), 20, "accessibleSpots.sensorStatus", "online"));
                spot.setLedStatus(optionalTrimmed(seed.ledStatus(), 10, "accessibleSpots.ledStatus", "green"));
                return spot;
            }).toList();
            accessibleSpotRepository.saveAll(accessibleSpots);
        }

        return savedLot;
    }

    private List<String> normalizeAmenities(List<String> amenities) {
        if (amenities == null || amenities.isEmpty()) return List.of();
        return amenities.stream()
            .filter(Objects::nonNull)
            .map(String::trim)
            .filter(s -> !s.isBlank())
            .distinct()
            .toList();
    }

    private ZoneType parseZone(String zoneRaw) {
        try {
            return ZoneType.valueOf(zoneRaw.trim().toUpperCase(Locale.ROOT));
        } catch (Exception ex) {
            throw new IllegalArgumentException("Invalid zone type: " + zoneRaw);
        }
    }

    private String resolveStatus(String statusRaw, ZoneType zone) {
        if (statusRaw != null && !statusRaw.isBlank()) return statusRaw.trim().toLowerCase(Locale.ROOT);
        if (zone == ZoneType.EV) return "ev";
        if (zone == ZoneType.ACCESSIBLE) return "accessible";
        return "free";
    }

    private String requireTrimmed(String value, String field, int maxLen) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException(field + " is required");
        String trimmed = value.trim();
        if (trimmed.length() > maxLen) {
            throw new IllegalArgumentException(field + " must be at most " + maxLen + " characters");
        }
        return trimmed;
    }

    private String optionalTrimmed(String value, int maxLen, String field, String defaultValue) {
        if (value == null || value.isBlank()) return defaultValue;
        String trimmed = value.trim();
        if (trimmed.length() > maxLen) {
            throw new IllegalArgumentException(field + " must be at most " + maxLen + " characters");
        }
        return trimmed;
    }

    private void createDefaultSpotsAndSensors(ParkingLot lot, int totalSpaces) {
        List<ParkingSpot> spots = new ArrayList<>(totalSpaces);
        for (int i = 1; i <= totalSpaces; i++) {
            ParkingSpot spot = new ParkingSpot();
            spot.setParkingLot(lot);
            spot.setSpotNumber("AUTO-" + i);
            spot.setZone(ZoneType.STANDARD);
            spot.setSpotRow(((i - 1) / 10) + 1);
            spot.setSpotCol(((i - 1) % 10) + 1);
            spot.setStatus("free");
            spots.add(spot);
        }
        List<ParkingSpot> savedSpots = parkingSpotRepository.saveAll(spots);
        createSensorsForSpots(lot, savedSpots);
    }

    private void createSensorsForSpots(ParkingLot lot, List<ParkingSpot> spots) {
        LocalDateTime now = LocalDateTime.now();
        List<SensorRegistry> sensors = spots.stream().map(spot -> {
            SensorRegistry sensor = new SensorRegistry();
            sensor.setSensorId("IR-" + spot.getId().toString().replace("-", "").substring(0, 16));
            sensor.setParkingLot(lot);
            sensor.setZone(spot.getSpotNumber());
            sensor.setStatus(SensorStatus.OPERATIONAL);
            sensor.setCreatedAt(now);
            sensor.setLastSeenAt(now);
            return sensor;
        }).toList();
        sensorRegistryRepository.saveAll(sensors);
    }

    private void createDefaultOcrCameras(ParkingLot lot) {
        LocalDateTime now = LocalDateTime.now();
        String lotKey = lot.getId().toString().replace("-", "").substring(0, 8).toUpperCase(Locale.ROOT);

        SensorRegistry entrance = new SensorRegistry();
        entrance.setSensorId("OCR-" + lotKey + "-ENT1");
        entrance.setParkingLot(lot);
        entrance.setZone("Entrada Principal");
        entrance.setStatus(SensorStatus.OPERATIONAL);
        entrance.setCreatedAt(now);
        entrance.setLastSeenAt(now);

        SensorRegistry exit = new SensorRegistry();
        exit.setSensorId("OCR-" + lotKey + "-SAI1");
        exit.setParkingLot(lot);
        exit.setZone("Saida Principal");
        exit.setStatus(SensorStatus.OPERATIONAL);
        exit.setCreatedAt(now);
        exit.setLastSeenAt(now);

        sensorRegistryRepository.saveAll(List.of(entrance, exit));
    }
}
