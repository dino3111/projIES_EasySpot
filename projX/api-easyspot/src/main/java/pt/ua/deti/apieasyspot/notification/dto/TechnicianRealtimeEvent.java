package pt.ua.deti.apieasyspot.notification.dto;

import java.time.Instant;
import java.util.UUID;

public record TechnicianRealtimeEvent(
    String type,
    UUID parkId,
    String sensorId,
    String status,
    UUID alertId,
    String alertState,
    Instant occurredAt
) {}
