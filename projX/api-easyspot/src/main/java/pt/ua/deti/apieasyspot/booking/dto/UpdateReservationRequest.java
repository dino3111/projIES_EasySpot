package pt.ua.deti.apieasyspot.booking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record UpdateReservationRequest(
    @NotNull UUID parkId,
    @NotNull UUID vehicleId,
    @NotBlank String arrivalDateTime,
    @NotBlank String departureDateTime,
    UUID selectedSpotId
) {}
