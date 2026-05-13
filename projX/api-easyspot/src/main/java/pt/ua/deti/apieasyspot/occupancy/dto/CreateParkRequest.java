package pt.ua.deti.apieasyspot.occupancy.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.UUID;

public record CreateParkRequest(
    @NotBlank String name,
    @NotBlank String city,
    @NotBlank String address,
    @NotNull Double latitude,
    @NotNull Double longitude,
    String openingHours,
    @NotNull @Positive Integer totalSpaces,
    UUID technicianId
) {}
