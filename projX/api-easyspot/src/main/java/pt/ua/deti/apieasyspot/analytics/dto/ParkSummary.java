package pt.ua.deti.apieasyspot.analytics.dto;

import java.math.BigDecimal;

public record ParkSummary(
    String name,
    String city,
    long entrances,
    int occupancyPercentage,
    BigDecimal earnings
) {}
