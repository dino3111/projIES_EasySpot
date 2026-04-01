package pt.ua.deti.apieasyspot.vehicle.dto;

public record VehicleData(
    String plate,
    String vin,
    String make,
    String model,
    String version,
    String plateDate,
    String color,
    String fuelType,
    String cubicCap,
    String powercv,
    String powerkw,
    String co2,
    String bodyType,
    String driveType,
    String categoryType,
    String ownerType,
    String ownerCategory,
    String categoryIUC,
    String isImported,
    String IUC
) {}
