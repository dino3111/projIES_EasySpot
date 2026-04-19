package pt.ua.deti.apieasyspot.vehicle.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VehicleCreateRequest(
    @NotBlank
    @Pattern(regexp = "^[A-Z0-9]{2}-[A-Z0-9]{2}-[A-Z0-9]{2}$", message = "Invalid license plate format. Expected format like AA-00-00, 00-AA-00, 00-00-AA or AA-00-AA")
    String licensePlate,

    String externalIdentifier
) {}
