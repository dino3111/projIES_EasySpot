package pt.ua.deti.apieasyspot.billing.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pt.ua.deti.apieasyspot.billing.model.ParkingSession;

import java.util.UUID;

public interface ParkingSessionRepository extends JpaRepository<ParkingSession, UUID> {}
