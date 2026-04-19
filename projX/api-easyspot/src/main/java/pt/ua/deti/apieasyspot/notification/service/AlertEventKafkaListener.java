package pt.ua.deti.apieasyspot.notification.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import pt.ua.deti.apieasyspot.notification.dto.AlertTriggerEvent;
import pt.ua.deti.apieasyspot.notification.model.AlertSubscriptionType;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.Locale;

@Slf4j
@Component
@RequiredArgsConstructor
public class AlertEventKafkaListener {

    private final ObjectMapper objectMapper;
    private final AlertNotificationDispatchService dispatchService;

    @KafkaListener(
        topics = {"occupancy-events", "sensor-events"},
        groupId = "${alerts.kafka.group-id:easyspot-alert-subscriptions}"
    )
    public void onEvent(String payload) {
        try {
            KafkaAlertPayload eventPayload = objectMapper.readValue(payload, KafkaAlertPayload.class);
            AlertSubscriptionType type = AlertSubscriptionType.valueOf(eventPayload.alertType().toUpperCase(Locale.ROOT));
            AlertTriggerEvent event = new AlertTriggerEvent(
                type,
                trimToNull(eventPayload.parkId()),
                trimToNull(eventPayload.vehicleId()),
                trimToNull(eventPayload.message()),
                parseInstant(eventPayload.occurredAt()),
                trimToNull(eventPayload.source())
            );
            dispatchService.handleEvent(event);
        } catch (Exception ex) {
            log.warn("Ignoring unsupported Kafka event payload for alerts: {}", payload);
        }
    }

    private Instant parseInstant(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Instant.parse(value);
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private record KafkaAlertPayload(
        String alertType,
        String parkId,
        String vehicleId,
        String message,
        String occurredAt,
        String source
    ) {}
}
