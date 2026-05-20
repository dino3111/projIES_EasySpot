package pt.ua.deti.apieasyspot.gate.dto;

import java.time.Instant;
import java.util.UUID;

public record GateCommandResponse(
    UUID commandId,
    String result,        // "EXECUTED" | "DENIED"
    UUID parkId,
    String gateId,
    String direction,
    String plate,
    UUID reservationId,
    String reason,
    Instant respondedAt
) {}
