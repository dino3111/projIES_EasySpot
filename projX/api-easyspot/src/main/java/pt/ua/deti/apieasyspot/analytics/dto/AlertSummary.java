package pt.ua.deti.apieasyspot.analytics.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record AlertSummary(
    UUID id,
    String type,
    String park,
    String zone,
    String sensorId,
    String plate,
    String description,
    String severity,
    String state,
    LocalDateTime createdAt,
    String attributedTo,
    String notes
) {}
