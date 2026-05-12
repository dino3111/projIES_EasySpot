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

    @Query("select a from TechnicianParkAssignment a where a.parkingLot.id = :parkingLotId")
    List<TechnicianParkAssignment> findByParkingLotId(UUID parkingLotId);

    @Query("delete from TechnicianParkAssignment a where a.parkingLot.id = :parkingLotId")
    @org.springframework.data.jpa.repository.Modifying
    void deleteByParkingLotId(UUID parkingLotId);

    @Query("delete from TechnicianParkAssignment a where a.parkingLot.id = :parkingLotId and a.technicianId = :technicianId")
    @org.springframework.data.jpa.repository.Modifying
    void deleteByParkingLotIdAndTechnicianId(UUID parkingLotId, UUID technicianId);
}
