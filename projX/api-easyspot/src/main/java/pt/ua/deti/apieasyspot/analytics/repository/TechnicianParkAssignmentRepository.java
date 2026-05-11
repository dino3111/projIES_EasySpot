package pt.ua.deti.apieasyspot.analytics.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import pt.ua.deti.apieasyspot.analytics.model.TechnicianParkAssignment;

import java.util.List;
import java.util.UUID;

public interface TechnicianParkAssignmentRepository extends JpaRepository<TechnicianParkAssignment, UUID> {

    List<TechnicianParkAssignment> findByTechnicianId(UUID technicianId);

    boolean existsByTechnicianIdAndParkingLotId(UUID technicianId, UUID parkingLotId);

    void deleteByTechnicianIdAndParkingLotId(UUID technicianId, UUID parkingLotId);

    @Query("select a.parkingLot.id from TechnicianParkAssignment a where a.technicianId = :technicianId")
    List<UUID> findParkingLotIdsByTechnicianId(UUID technicianId);
}
