package pt.ua.deti.apieasyspot.auth.dto;

import jakarta.validation.constraints.NotNull;
import pt.ua.deti.apieasyspot.auth.model.DriverType;

public record DriverTypeUpdateRequest(
    @NotNull DriverType driverType,
    String userId
) {}