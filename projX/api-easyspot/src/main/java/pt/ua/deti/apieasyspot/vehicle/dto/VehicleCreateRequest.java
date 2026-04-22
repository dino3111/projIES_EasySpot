package pt.ua.deti.apieasyspot.vehicle.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record VehicleCreateRequest(
    @NotBlank @Size(max = 10) String licensePlate,
    String externalIdentifier,
    String make,
    String model,
    String fuelType,
    Integer year
) {
    public boolean hasManualData() {
        return make != null && model != null && fuelType != null && year != null;
    }
}
