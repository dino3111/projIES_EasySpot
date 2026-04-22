package pt.ua.deti.apieasyspot.analytics.dto;

public record DailyMetric(
    String date,
    String day,
    long entrances,
    double earnings
) {}
