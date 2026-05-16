package pt.ua.deti.apieasyspot.auth.dto;

import pt.ua.deti.apieasyspot.auth.model.DriverType;
import java.util.Set;

public record ProfileUpdateRequest(
    DriverType driverType,
    Set<DriverType> driverTypes,
    Boolean notificationsEnabled,
    Boolean pushNotificationsEnabled,
    Boolean emailNotificationsEnabled,
    String photoUrl
) {}
