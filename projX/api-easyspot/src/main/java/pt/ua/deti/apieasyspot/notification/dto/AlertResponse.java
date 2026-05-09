package pt.ua.deti.apieasyspot.notification.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AlertResponse(
    UUID id,
    String type,
    String park,
    String zone,
    String spotNumber,
    String sensorId,
    String plate,
    String description,
    String severity,
    String state,
    OffsetDateTime createdAt,
    String attributedTo,
    String notes
) {}
