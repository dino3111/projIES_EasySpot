package pt.ua.deti.apieasyspot.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import pt.ua.deti.apieasyspot.auth.model.DriverType;
import java.util.Set;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record DriverProfileResponse(
    String name,
    String email,
    String role,
    String photoUrl,
    DriverType driverType,
    Set<DriverType> driverTypes,
    boolean notificationsEnabled,
    boolean pushNotificationsEnabled,
    boolean emailNotificationsEnabled,
    SpendingSummary spending,
    long favoritesCount
) {}
