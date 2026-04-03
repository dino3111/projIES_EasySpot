package pt.ua.deti.apieasyspot.analytics.dto;

import java.math.BigDecimal;

public record KpiSummary (
    long TodayEntrances,
    double entranceVariance,
    int averageOccupancy,
    int totalLots,
    int occupiedLots,
    BigDecimal totalEarnings,
    double earningsVariance,
    String averageOccupancyTime,
    long alertsOpened,
    int activeParks
){}
