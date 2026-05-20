package pt.ua.deti.apieasyspot.gate.kafka;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.Instant;
import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public record GateEvent(
    UUID eventId,
    String eventType,
    String parkId,
    Instant occurredAt,
    int version,
    Payload payload
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Payload(
        String gateId,
        String direction,
        String state,
        String previousState,
        String parkName,
        String reason,
        String plate
    ) {}
}
