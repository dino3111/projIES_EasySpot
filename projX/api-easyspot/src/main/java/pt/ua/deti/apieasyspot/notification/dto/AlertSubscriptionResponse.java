package pt.ua.deti.apieasyspot.notification.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record AlertSubscriptionResponse(
    AlertSubscriptionPayload alertSubscription
) {
    public record AlertSubscriptionPayload(
        UUID id,
        boolean enabled,
        LocalDateTime createdAt
    ) {}
}
