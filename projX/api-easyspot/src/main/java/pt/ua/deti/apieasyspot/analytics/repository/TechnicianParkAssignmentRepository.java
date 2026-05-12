package pt.ua.deti.apieasyspot.analytics.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pt.ua.deti.apieasyspot.analytics.model.TechnicianParkAssignment;

import java.util.List;
import java.util.UUID;

@Repository("analyticsTechnicianParkAssignmentRepository")
public interface TechnicianParkAssignmentRepository extends JpaRepository<TechnicianParkAssignment, UUID> {

    List<TechnicianParkAssignment> findByTechnicianId(UUID technicianId);

    boolean existsByTechnicianIdAndParkingLotId(UUID technicianId, UUID parkingLotId);

    void deleteByTechnicianIdAndParkingLotId(UUID technicianId, UUID parkingLotId);

    List<UUID> findParkingLotIdByTechnicianId(UUID technicianId);
}
