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
    Integer yearTo,
    String fuelType,
    Double powerKW,
    Double powerCV,
    Integer displacementCc,
    String bodyType,
    String driveType,
    String engineCode,
    String imageUrl,
    String brandLogoUrl,
    String nickname,
    boolean isEv,
    boolean isAccessible,
    boolean isPrimary
) {}
