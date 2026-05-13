package pt.ua.deti.apieasyspot.vehicle.dto;

public record VehicleLookupResponse(
    String plate,
    String vin,
    String make,
    String model,
    String version,
    Integer yearFrom,
    Integer yearTo,
    String fuelType,
    Double powerKw,
    Double powerCv,
    Integer displacementCc,
    String bodyType,
    String driveType,
    String engineCode,
    String imageUrl,
    String brandLogoUrl
) {}
