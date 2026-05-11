package pt.ua.deti.apieasyspot.notification.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pt.ua.deti.apieasyspot.notification.model.NotificationEmailDelivery;

import java.util.Optional;
import java.util.UUID;

public interface NotificationEmailDeliveryRepository extends JpaRepository<NotificationEmailDelivery, UUID> {
    Optional<NotificationEmailDelivery> findByDeliveryKey(String deliveryKey);
}
