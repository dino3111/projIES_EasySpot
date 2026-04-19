package pt.ua.deti.apieasyspot.occupancy.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pt.ua.deti.apieasyspot.occupancy.model.OccupancySnapshot;

import java.util.UUID;

public interface OccupancySnapshotRepository extends JpaRepository<OccupancySnapshot, UUID> {}
