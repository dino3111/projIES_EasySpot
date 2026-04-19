package pt.ua.deti.apieasyspot.notification.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pt.ua.deti.apieasyspot.notification.model.Alert;

import java.util.UUID;

public interface AlertRepository extends JpaRepository<Alert, UUID> {}
