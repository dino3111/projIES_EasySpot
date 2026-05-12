package pt.ua.deti.apieasyspot.analytics.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import pt.ua.deti.apieasyspot.analytics.model.TechnicianParkAssignment;

import java.util.List;
import java.util.UUID;

@Repository("analyticsTechnicianParkAssignmentRepository")
public interface TechnicianParkAssignmentRepository extends JpaRepository<TechnicianParkAssignment, UUID> {

    List<TechnicianParkAssignment> findByTechnicianId(UUID technicianId);

    boolean existsByTechnicianIdAndParkingLot_Id(UUID technicianId, UUID parkingLotId);

    void deleteByTechnicianIdAndParkingLot_Id(UUID technicianId, UUID parkingLotId);

    @Query("select a.parkingLot.id from AnalyticsTechnicianParkAssignment a where a.technicianId = :technicianId")
    List<UUID> findParkingLotIdsByTechnicianId(UUID technicianId);
}
