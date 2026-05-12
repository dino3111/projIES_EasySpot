package pt.ua.deti.apieasyspot.analytics.dto;

import pt.ua.deti.apieasyspot.analytics.model.TechnicianParkAssignment;

import java.util.UUID;

public record TechnicianParkAssignmentDto(
    UUID assignmentId,
    UUID technicianId,
    UUID parkingLotId,
    String parkingLotName,
    String parkingLotCity
) {
    public static TechnicianParkAssignmentDto from(TechnicianParkAssignment a) {
        return new TechnicianParkAssignmentDto(
            a.getId(),
            a.getTechnicianId(),
            a.getParkingLot().getId(),
            a.getParkingLot().getName(),
            a.getParkingLot().getCity()
        );
    }
}
