package pt.ua.deti.apieasyspot.auth.dto;

public record TechnicianProfileResponse(
    String name,
    String email,
    String role,
    String photoUrl,
    boolean notificationsEnabled,
    long assignedTasks,
    SensorSummary sensorSummary,
    long openFaults
) {}