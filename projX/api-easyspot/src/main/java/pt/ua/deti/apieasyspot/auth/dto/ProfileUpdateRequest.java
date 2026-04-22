package pt.ua.deti.apieasyspot.auth.dto;

import pt.ua.deti.apieasyspot.auth.model.DriverType;

public record ProfileUpdateRequest(
    DriverType driverType,
    Boolean notificationsEnabled,
    String photoUrl
) {}