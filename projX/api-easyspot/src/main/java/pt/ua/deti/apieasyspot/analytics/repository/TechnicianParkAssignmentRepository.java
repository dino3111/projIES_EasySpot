package pt.ua.deti.apieasyspot.analytics.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import pt.ua.deti.apieasyspot.analytics.model.TechnicianParkAssignment;

import java.util.List;
import java.util.UUID;

@Repository("analyticsTechnicianParkAssignmentRepository")
public interface TechnicianParkAssignmentRepository extends JpaRepository<TechnicianParkAssignment, UUID> {

    interface AssignmentRow {
        UUID getParkingLotId();
        UUID getTechnicianId();
    }

    List<TechnicianParkAssignment> findByTechnicianId(UUID technicianId);

    List<TechnicianParkAssignment> findByParkingLotId(UUID parkingLotId);

    boolean existsByTechnicianIdAndParkingLotId(UUID technicianId, UUID parkingLotId);

    void deleteByTechnicianIdAndParkingLotId(UUID technicianId, UUID parkingLotId);

    @Query("select t.parkingLotId as parkingLotId, t.technicianId as technicianId from AnalyticsTechnicianParkAssignment t")
    List<AssignmentRow> findAllAssignmentRows();

    @Query("select t.parkingLotId from AnalyticsTechnicianParkAssignment t where t.technicianId = :technicianId")
    List<UUID> findParkingLotIdByTechnicianId(@Param("technicianId") UUID technicianId);
}
