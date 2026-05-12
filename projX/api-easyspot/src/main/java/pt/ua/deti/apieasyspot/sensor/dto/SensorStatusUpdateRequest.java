package pt.ua.deti.apieasyspot.sensor.dto;

import jakarta.validation.constraints.NotBlank;

public record SensorStatusUpdateRequest(
    @NotBlank String status,
    String notes
) {}
