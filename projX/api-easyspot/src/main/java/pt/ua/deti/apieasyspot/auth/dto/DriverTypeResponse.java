package pt.ua.deti.apieasyspot.auth.dto;

import pt.ua.deti.apieasyspot.auth.model.DriverType;

public record DriverTypeResponse(
    String id,
    String name,
    String email,
    String role,
    DriverType driverType
) {}