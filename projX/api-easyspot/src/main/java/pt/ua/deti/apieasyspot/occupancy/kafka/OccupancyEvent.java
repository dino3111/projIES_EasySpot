package pt.ua.deti.apieasyspot.occupancy.kafka;

import java.time.Instant;
import java.util.UUID;

public record OccupancyEvent(
    UUID eventId,
    String eventType,
    UUID parkId,
    UUID spotId,
    String previousStatus,
    String status,
    Instant occurredAt,
    String zone,
    String spotNumber,
    int version
) {}
