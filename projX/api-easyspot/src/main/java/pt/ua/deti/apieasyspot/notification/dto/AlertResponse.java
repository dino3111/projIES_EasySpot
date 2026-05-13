package pt.ua.deti.apieasyspot.notification.dto;

import pt.ua.deti.apieasyspot.notification.model.Alert;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AlertResponse(
    UUID id,
    String type,
    String park,
    String zone,
    String spotNumber,
    String sensorId,
    String plate,
    String description,
    String photoUrl,
    String reportedBy,
    String severity,
    String state,
    OffsetDateTime createdAt,
    String attributedTo,
    String notes
) {
    public static AlertResponse from(Alert a) {
        return new AlertResponse(
            a.getId(),
            a.getType().name(),
            a.getParkingLotName(),
            a.getZone(),
            a.getSpotNumber(),
            a.getSensorId(),
            a.getPlate(),
            a.getDescription(),
            a.getPhotoUrl(),
            a.getReportedBy(),
            a.getSeverity().name(),
            a.getState().name(),
            a.getCreatedAt(),
            a.getAttributedTo(),
            a.getNotes()
        );
    }
}
