package pt.ua.deti.apieasyspot.auth.dto;

import java.math.BigDecimal;

public record ManagerProfileResponse(
    String name,
    String email,
    String role,
    String photoUrl,
    boolean notificationsEnabled,
    int managedParks,
    BigDecimal todayRevenue,
    long todayVehicles,
    long openAlerts
) {}