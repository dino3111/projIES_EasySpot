package pt.ua.deti.apieasyspot.vehicle.dto;

public record VehicleLookupResponse(
    String plate,
    String make,
    String model,
    String version,
    String color,
    String fuelType,
    String plateDate,
    String categoryType,
    String vin
) {}
