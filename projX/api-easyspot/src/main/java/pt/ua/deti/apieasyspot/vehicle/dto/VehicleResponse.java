package pt.ua.deti.apieasyspot.vehicle.dto;

import java.util.UUID;

public record VehicleResponse(
    UUID id,
    String plate,
    String make,
    String model,
    String version,
    String color,
    int year,
    String fuelType,
    Double powerKW,
    String nickname,
    boolean isEv,
    boolean isAccessible,
    boolean isPrimary
) {}
