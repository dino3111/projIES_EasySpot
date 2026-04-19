package pt.ua.deti.apieasyspot.analytics.dto;

public record HourlyOccupancyDto(
    String time,
    int occupancy
) {}
