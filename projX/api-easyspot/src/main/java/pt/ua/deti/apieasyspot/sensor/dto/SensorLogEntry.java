package pt.ua.deti.apieasyspot.sensor.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record SensorLogEntry(
    UUID alertId,
    String type,
    String severity,
    String state,
    String description,
    OffsetDateTime createdAt,
    OffsetDateTime resolvedAt
) {}
