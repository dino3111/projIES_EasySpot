package pt.ua.deti.apieasyspot.occupancy.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.auth.service.AuthentikClient;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;
import pt.ua.deti.apieasyspot.occupancy.dto.*;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;
import pt.ua.deti.apieasyspot.occupancy.model.TechnicianParkAssignment;
import pt.ua.deti.apieasyspot.occupancy.repository.TechnicianParkAssignmentRepository;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ManagerParkService {

    private final UserRepository userRepository;
    private final ParkingLotRepository parkingLotRepository;
    private final TechnicianParkAssignmentRepository assignmentRepository;
    private final AuthentikClient authentikClient;

    public List<TechnicianSummaryResponse> listTechnicians() {
        return userRepository.findByRole("TECHNICAL").stream()
            .map(u -> new TechnicianSummaryResponse(u.getId(), u.getName(), u.getEmail()))
            .toList();
    }

    public List<ParkAssignmentsResponse> listParkAssignments() {
        List<TechnicianParkAssignment> all = assignmentRepository.findAll();
        Map<UUID, List<UUID>> byPark = new HashMap<>();
        for (TechnicianParkAssignment a : all) {
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
    }

    @Transactional
    public void removeTechnicianFromPark(UUID parkId, UUID technicianId) {
        assignmentRepository.deleteByParkingLotIdAndTechnicianId(parkId, technicianId);
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

        if (req.technicianId() != null) {
            TechnicianParkAssignment assignment = new TechnicianParkAssignment();
            assignment.setTechnicianId(req.technicianId());
            assignment.setParkingLotId(saved.getId());
            assignmentRepository.save(assignment);
        }

        return saved;
    }
}
