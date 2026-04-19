package pt.ua.deti.apieasyspot.occupancy.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;

import java.util.UUID;

public interface ParkingLotRepository extends JpaRepository <ParkingLot, UUID>{}
