package pt.ua.deti.apieasyspot.occupancy.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import pt.ua.deti.apieasyspot.occupancy.model.AccessibleSpot;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface AccessibleSpotRepository extends JpaRepository<AccessibleSpot, UUID> {
    List<AccessibleSpot> findByParkingLotId(UUID parkingLotId);
    @Query("SELECT a FROM AccessibleSpot a WHERE a.parkingLotId IN :lotIds")
    List<AccessibleSpot> findByParkingLotIdIn(@org.springframework.data.repository.query.Param("lotIds") Collection<UUID> lotIds);
    @Query("SELECT DISTINCT a.parkingLot.id FROM AccessibleSpot a")
    List<UUID> findDistinctParkingLotIds();
    @Query("SELECT DISTINCT a.parkingLot.id FROM AccessibleSpot a WHERE a.available = true")
    List<UUID> findDistinctParkingLotIdsWithAvailableSpots();
    void deleteByParkingLotId(UUID parkingLotId);
}
