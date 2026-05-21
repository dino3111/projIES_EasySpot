package pt.ua.deti.apieasyspot.notification.dto;

import java.time.OffsetDateTime;

public record AlertStateHistoryEntry(
    String previousState,
    String newState,
    String changedBy,
    String notes,
    OffsetDateTime changedAt
) {}
