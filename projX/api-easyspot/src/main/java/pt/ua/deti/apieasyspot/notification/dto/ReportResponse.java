package pt.ua.deti.apieasyspot.notification.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ReportResponse(
    UUID id,
    String type,
    UUID parkId,
    String parkName,
    String zone,
    String spotNumber,
    String plate,
    String description,
    String photoUrl,
    String severity,
    String sate,
    LocalDateTime createdAt
) {}
