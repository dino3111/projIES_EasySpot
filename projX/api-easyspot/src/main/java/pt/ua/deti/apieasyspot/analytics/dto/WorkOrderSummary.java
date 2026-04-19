package pt.ua.deti.apieasyspot.analytics.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record WorkOrderSummary(
    UUID id,
    String type,
    String park,
    String zone,
    String sensorId,
    String description,
    String severity,
    String state,
    OffsetDateTime createdAt,
    String attributedTo
) {}
