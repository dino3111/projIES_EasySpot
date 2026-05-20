package pt.ua.deti.apieasyspot.gate.kafka;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public record GateEvent(
    UUID eventId,
    UUID parkId,
    String gateId,
    String direction,
    String eventType,
    String state,
    String previousState,
    String plate,
    String reason,
    Instant occurredAt,
    Map<String, Object> extra
) {}
