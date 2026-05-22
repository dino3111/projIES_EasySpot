package pt.ua.deti.apieasyspot.occupancy.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import pt.ua.deti.apieasyspot.occupancy.model.EVCharger;

import java.util.List;
import java.util.UUID;

public interface EVChargerRepository extends JpaRepository<EVCharger, UUID> {
    List<EVCharger> findByParkingLotId(UUID parkingLotId);
    @Query("SELECT DISTINCT e.parkingLot.id FROM EVCharger e")
    List<UUID> findDistinctParkingLotIds();
    void deleteByParkingLotId(UUID parkingLotId);
}
