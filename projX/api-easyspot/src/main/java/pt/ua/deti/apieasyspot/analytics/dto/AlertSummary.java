package pt.ua.deti.apieasyspot.analytics.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AlertSummary(
    UUID id,
    String type,
    String park,
    String zone,
    String sensorId,
    String plate,
    String description,
    String photoUrl,
    String severity,
    String state,
    OffsetDateTime createdAt,
    String attributedTo,
    String notes
) {}
