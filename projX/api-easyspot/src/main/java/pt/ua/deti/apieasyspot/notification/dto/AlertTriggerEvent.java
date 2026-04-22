package pt.ua.deti.apieasyspot.notification.dto;

import pt.ua.deti.apieasyspot.notification.model.AlertSubscriptionType;

import java.time.Instant;

public record AlertTriggerEvent(
    AlertSubscriptionType alertType,
    String parkId,
    String vehicleId,
    String message,
    Instant occurredAt,
    String source
) {}
