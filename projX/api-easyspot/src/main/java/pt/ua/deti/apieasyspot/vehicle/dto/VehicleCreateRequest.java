package pt.ua.deti.apieasyspot.vehicle.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public record VehicleCreateRequest(
    @NotBlank @Size(max = 10) String licensePlate,
    String externalIdentifier,
    @Size(max = 50) String nickname,
    Boolean isAccessible,
    Boolean isPrimary,
    List<String> chargerTypes,
    String make,
    String model,
    String fuelType,
    Integer year
) {
    public boolean hasManualData() {
        return make != null && model != null && fuelType != null && year != null;
    }
}
