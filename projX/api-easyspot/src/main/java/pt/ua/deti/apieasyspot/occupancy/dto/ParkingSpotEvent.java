package pt.ua.deti.apieasyspot.occupancy.dto;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record ParkingSpotEvent(
    UUID eventId,
    String eventType,
    UUID parkId,
    UUID spotId,
    String previousStatus,
    String status,
    Instant occurredAt,
    Map<String, Object> payload,
    Integer version
) {}
