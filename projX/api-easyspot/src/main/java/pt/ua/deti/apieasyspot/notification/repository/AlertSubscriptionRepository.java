package pt.ua.deti.apieasyspot.notification.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import pt.ua.deti.apieasyspot.notification.model.AlertSubscription;
import pt.ua.deti.apieasyspot.notification.model.AlertSubscriptionType;

import java.util.List;
import java.util.UUID;

public interface AlertSubscriptionRepository extends JpaRepository<AlertSubscription, UUID> {
    boolean existsByUser_IdAndAlertTypeAndParkScopeKey(UUID userId, AlertSubscriptionType alertType, String parkScopeKey);

    java.util.Optional<AlertSubscription> findFirstByUser_IdAndAlertTypeAndParkScopeKey(UUID userId, AlertSubscriptionType alertType, String parkScopeKey);

    @EntityGraph(attributePaths = {"user"})
    List<AlertSubscription> findByEnabledTrueAndAlertType(AlertSubscriptionType alertType);
}
