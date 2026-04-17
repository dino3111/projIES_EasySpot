package pt.ua.deti.apieasyspot.notification.dto;

import java.util.UUID;

public record CreateReportRequest(
    UUID parkingLotId,
    String zone,
    String sportNumber,
    String violationType,
    String vehiclePlate,
    String description
) {}
