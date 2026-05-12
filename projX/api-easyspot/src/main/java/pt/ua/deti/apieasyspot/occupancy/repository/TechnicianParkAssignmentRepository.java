package pt.ua.deti.apieasyspot.occupancy.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pt.ua.deti.apieasyspot.occupancy.model.TechnicianParkAssignment;

import java.util.List;
import java.util.UUID;

public interface TechnicianParkAssignmentRepository extends JpaRepository<TechnicianParkAssignment, UUID> {
    List<TechnicianParkAssignment> findByParkingLotId(UUID parkingLotId);
    List<TechnicianParkAssignment> findByTechnicianId(UUID technicianId);
    void deleteByParkingLotIdAndTechnicianId(UUID parkingLotId, UUID technicianId);
}
