package pt.ua.deti.apieasyspot.analytics.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pt.ua.deti.apieasyspot.analytics.model.TechnicianParkAssignment;
import pt.ua.deti.apieasyspot.analytics.repository.TechnicianParkAssignmentRepository;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;

import java.util.List;
import java.util.LinkedHashSet;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class TechnicianParkAssignmentService {

    private final TechnicianParkAssignmentRepository assignmentRepository;
    private final pt.ua.deti.apieasyspot.occupancy.repository.TechnicianParkAssignmentRepository occupancyAssignmentRepository;
    private final UserRepository userRepository;
    private final ParkingLotRepository parkingLotRepository;

    public List<TechnicianParkAssignment> getAssignments(UUID technicianId) {
        return assignmentRepository.findByTechnicianId(technicianId);
    }

    public List<UUID> getAssignedParkIds(String authentikUserId) {
        User user = resolveUser(authentikUserId);
        LinkedHashSet<UUID> merged = new LinkedHashSet<>(assignmentRepository.findParkingLotIdByTechnicianId(user.getId()));
        occupancyAssignmentRepository.findByTechnicianId(user.getId())
            .stream()
            .map(pt.ua.deti.apieasyspot.occupancy.model.TechnicianParkAssignment::getParkingLotId)
            .forEach(merged::add);
        log.info(
            "[TECH-ASSIGN] subject={} resolvedUserId={} role={} parks={} (analytics+occupancy merged)",
            authentikUserId, user.getId(), user.getRole(), merged
        );
        return List.copyOf(merged);
    }

    @Transactional
    public TechnicianParkAssignment assign(UUID technicianId, UUID parkingLotId) {
        if (assignmentRepository.existsByTechnicianIdAndParkingLotId(technicianId, parkingLotId)) {
            return assignmentRepository.findByTechnicianId(technicianId).stream()
                .filter(a -> parkingLotId.equals(a.getParkingLotId()))
                .findFirst()
                .orElseThrow();
        }
        ParkingLot lot = parkingLotRepository.findById(parkingLotId)
            .orElseThrow(() -> new ResourceNotFoundException("ParkingLot not found: " + parkingLotId));
        return assignmentRepository.save(new TechnicianParkAssignment(technicianId, lot));
    }

    @Transactional
    public void unassign(UUID technicianId, UUID parkingLotId) {
        assignmentRepository.deleteByTechnicianIdAndParkingLotId(technicianId, parkingLotId);
    }

    public UUID resolveDbId(String authentikUserId) {
        return resolveUser(authentikUserId).getId();
    }

    private User resolveUser(String authentikSubject) {
        User user = userRepository.findByAuthentikUserId(authentikSubject)
            .or(() -> userRepository.findByAuthentikPk(authentikSubject))
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + authentikSubject));
        log.info(
            "[TECH-ASSIGN] resolved subject={} -> userId={} email={} role={} authentikUserId={} authentikPk={}",
            authentikSubject, user.getId(), user.getEmail(), user.getRole(), user.getAuthentikUserId(), user.getAuthentikPk()
        );
        return user;
    }
}
