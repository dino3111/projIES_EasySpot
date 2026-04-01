package pt.ua.deti.apieasyspot.vehicle.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record VehicleUpdateRequest(
    @NotBlank String plate,
    @Size(max = 50) String nickname,
    boolean isPrimary
) {}
