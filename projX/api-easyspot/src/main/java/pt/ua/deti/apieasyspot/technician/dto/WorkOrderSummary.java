package pt.ua.deti.apieasyspot.technician.dto;

import java.time.LocalDateTime;
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
    LocalDateTime createdAt,
    String attributedTo
) {}
