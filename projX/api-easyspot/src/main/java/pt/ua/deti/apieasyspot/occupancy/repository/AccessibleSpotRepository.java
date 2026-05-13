package pt.ua.deti.apieasyspot.occupancy.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pt.ua.deti.apieasyspot.occupancy.model.AccessibleSpot;

import java.util.List;
import java.util.UUID;

public interface AccessibleSpotRepository extends JpaRepository<AccessibleSpot, UUID> {
    List<AccessibleSpot> findByParkingLotId(UUID parkingLotId);
    void deleteByParkingLotId(UUID parkingLotId);
}
