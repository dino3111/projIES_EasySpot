package pt.ua.deti.apieasyspot.analytics.dto;

public record ZoneOccupancyDto(
    String name,
    String type,
    int total,
    int occupied
) {}
