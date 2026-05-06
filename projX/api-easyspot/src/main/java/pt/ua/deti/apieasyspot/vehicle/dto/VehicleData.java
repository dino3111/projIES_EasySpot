package pt.ua.deti.apieasyspot.vehicle.dto;

public record VehicleData(
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
    Integer cylinders,
    String bodyType,
    String driveType,
    String engineCode,
    String engineType,
    String imageUrl,
    String externalSourceId,
    String canonicalUrl
) {}
