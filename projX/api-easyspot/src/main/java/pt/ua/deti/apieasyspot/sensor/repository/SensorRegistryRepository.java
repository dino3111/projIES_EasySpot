package pt.ua.deti.apieasyspot.sensor.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pt.ua.deti.apieasyspot.sensor.model.SensorRegistry;

import java.util.UUID;

public interface SensorRegistryRepository extends JpaRepository<SensorRegistry, String> {
    void deleteAllByParkingLotId(UUID parkingLotId);
}
