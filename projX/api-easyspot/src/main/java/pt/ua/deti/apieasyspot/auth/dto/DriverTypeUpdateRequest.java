package pt.ua.deti.apieasyspot.auth.dto;

import jakarta.validation.constraints.NotNull;
import pt.ua.deti.apieasyspot.auth.model.DriverType;
import java.util.Set;

public record DriverTypeUpdateRequest(
    @NotNull DriverType driverType,
    Set<DriverType> driverTypes,
    String userId
) {}
