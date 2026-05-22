package pt.ua.deti.apieasyspot.sensor.dto;

import java.time.OffsetDateTime;

public record BackendDecisionHistoryEntry(
    String entityType,
    String entityId,
    String decisionType,
    String decisionSource,
    String details,
    OffsetDateTime decidedAt
) {}
