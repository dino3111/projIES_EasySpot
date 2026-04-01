package pt.ua.deti.apieasyspot.vehicle.repository;

import pt.ua.deti.apieasyspot.vehicle.model.Vehicle;

import java.util.Optional;
import java.util.UUID;
import java.util.List;

public interface VehicleRepository {
    List<Vehicle> findByUserId(UUID userId);
    Optional<Vehicle> findByIdAndUserId(UUID id, UUID userId);
}
