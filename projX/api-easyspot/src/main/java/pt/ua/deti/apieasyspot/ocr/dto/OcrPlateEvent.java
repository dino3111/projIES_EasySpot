package pt.ua.deti.apieasyspot.ocr.dto;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record OcrPlateEvent(
    UUID eventId,
    String eventType,        // "ocr.plate.read" | "ocr.plate.failure"
    UUID parkId,
    UUID spotId,
    Instant occurredAt,
    OcrPayload payload,
    Integer version
) {
    public record OcrPayload(
        String plate,
        Double confidence,
        String direction,     // "entry" | "exit"
        String parkName,
        String spotNumber,
        String zone,
        Integer row,
        Integer col,
        String failureMode,   // null for normal reads
        Map<String, Object> extensions  // reserved for future fields
    ) {
        public boolean isFailure() {
            return failureMode != null && !failureMode.isBlank();
        }
    }
}
