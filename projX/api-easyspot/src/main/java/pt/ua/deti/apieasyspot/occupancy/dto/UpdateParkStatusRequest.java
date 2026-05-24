package pt.ua.deti.apieasyspot.occupancy.dto;

import jakarta.validation.constraints.NotNull;
import pt.ua.deti.apieasyspot.occupancy.model.ParkStatus;

public record UpdateParkStatusRequest(
    @NotNull ParkStatus status
) {}
