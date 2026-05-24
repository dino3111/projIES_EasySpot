package pt.ua.deti.apieasyspot.occupancy.dto;

import pt.ua.deti.apieasyspot.occupancy.model.ParkStatus;

import java.util.UUID;

public record ManagerParkSummaryResponse(
    UUID id,
    String name,
    String city,
    String address,
    Double latitude,
    Double longitude,
    String openingHours,
    int totalSpaces,
    ParkStatus status
) {}
