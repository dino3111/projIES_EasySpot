package pt.ua.deti.apieasyspot.gate.dto;

import java.time.Instant;
import java.util.UUID;

public record GateCommand(
    UUID commandId,
    String commandType,   // "OPEN_GATE" | "BLOCK_GATE"
    UUID parkId,
    String gateId,
    String direction,     // "exit"
    String plate,
    UUID reservationId,
    String reason,
    Instant issuedAt
) {}
