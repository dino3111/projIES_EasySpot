package pt.ua.deti.apieasyspot.notification.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import pt.ua.deti.apieasyspot.booking.model.Reservation;
import pt.ua.deti.apieasyspot.notification.dto.AlertTriggerEvent;
import pt.ua.deti.apieasyspot.notification.model.AlertSubscription;
import pt.ua.deti.apieasyspot.notification.repository.AlertSubscriptionRepository;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AlertNotificationDispatchService {

    private final AlertSubscriptionRepository alertSubscriptionRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Value("${alerts.kafka.max-lag-seconds:300}")
    private long maxLagSeconds;

    @Transactional(readOnly = true)
    public int handleEvent(AlertTriggerEvent event) {
        if (event == null || event.alertType() == null) {
            return 0;
        }
        if (isLagged(event)) {
            return 0;
        }

        List<AlertSubscription> subscriptions = alertSubscriptionRepository
            .findByEnabledTrueAndAlertType(event.alertType());

        int delivered = 0;
        for (AlertSubscription subscription : subscriptions) {
            if (matchesPark(subscription, event.parkId()) && matchesVehicle(subscription, event.vehicleId())) {
                String destination = "/topic/alerts/" + subscription.getUser().getAuthentikUserId();
                messagingTemplate.convertAndSend(destination, event);
                delivered++;
            }
        }
        return delivered;
    }

    private boolean matchesPark(AlertSubscription subscription, String parkId) {
        if (!StringUtils.hasText(subscription.getParkIdsCsv())) {
            return true;
        }
        if (!StringUtils.hasText(parkId)) {
            return false;
        }
        return List.of(subscription.getParkIdsCsv().split(",")).contains(parkId);
    }

    private boolean matchesVehicle(AlertSubscription subscription, String vehicleId) {
        if (!StringUtils.hasText(subscription.getVehicleId())) {
            return true;
        }
        return StringUtils.hasText(vehicleId) && subscription.getVehicleId().equalsIgnoreCase(vehicleId.trim());
    }

    public void sendReservationConfirmed(Reservation reservation) {
        String userId = reservation.getUser().getAuthentikUserId();
        if (userId == null || userId.isBlank()) {
            log.warn("Cannot send WS reservation notification: user {} has no authentikUserId",
                reservation.getUser().getId());
            return;
        }
        Map<String, Object> payload = Map.of(
            "alertType", "RESERVATION_CONFIRMED",
            "parkId", reservation.getParkingLot().getId().toString(),
            "vehicleId", reservation.getVehicle() != null ? reservation.getVehicle().getId().toString() : "",
            "message", "Reserva " + reservation.getBookingCode() + " confirmada em " + reservation.getParkingLot().getName(),
            "bookingCode", reservation.getBookingCode(),
            "occurredAt", Instant.now().toString(),
            "source", "reservation-service"
        );
        messagingTemplate.convertAndSend("/topic/alerts/" + userId, (Object) payload);
        log.info("[WS] Reservation confirmed notification sent to user={} booking={}", userId, reservation.getBookingCode());
    }

    private boolean isLagged(AlertTriggerEvent event) {
        if (event.occurredAt() == null) {
            return false;
        }
        long lagSeconds = Duration.between(event.occurredAt(), Instant.now()).getSeconds();
        boolean lagged = lagSeconds > maxLagSeconds;
        if (lagged) {
            log.warn("Skipping lagged Kafka alert event ({}s > {}s): {}", lagSeconds, maxLagSeconds, event);
        }
        return lagged;
    }
}
