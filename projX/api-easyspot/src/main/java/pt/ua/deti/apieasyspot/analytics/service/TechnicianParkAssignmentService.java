package pt.ua.deti.apieasyspot.analytics.service;

import lombok.RequiredArgsConstructor;
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
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TechnicianParkAssignmentService {

    private final TechnicianParkAssignmentRepository assignmentRepository;
    private final UserRepository userRepository;
    private final ParkingLotRepository parkingLotRepository;

    public List<TechnicianParkAssignment> getAssignments(UUID technicianId) {
        return assignmentRepository.findByTechnicianId(technicianId);
    }

    public List<UUID> getAssignedParkIds(String authentikUserId) {
        User user = userRepository.findByAuthentikUserId(authentikUserId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + authentikUserId));
        return assignmentRepository.findParkingLotIdsByTechnicianId(user.getId());
    }

    @Transactional
    public TechnicianParkAssignment assign(UUID technicianId, UUID parkingLotId) {
        if (assignmentRepository.existsByTechnicianIdAndParkingLotId(technicianId, parkingLotId)) {
            return assignmentRepository.findByTechnicianId(technicianId).stream()
                .filter(a -> a.getParkingLot().getId().equals(parkingLotId))
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
        return userRepository.findByAuthentikUserId(authentikUserId)
            .map(User::getId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + authentikUserId));
    }
}
