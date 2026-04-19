package pt.ua.deti.apieasyspot.occupancy.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pt.ua.deti.apieasyspot.occupancy.model.Tariff;

import java.util.List;
import java.util.UUID;

public interface TariffRepository extends JpaRepository<Tariff, UUID> {
    List<Tariff> findByParkingLotId(UUID parkingLotId);
}
