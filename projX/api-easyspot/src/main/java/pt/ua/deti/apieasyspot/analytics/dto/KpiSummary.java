package pt.ua.deti.apieasyspot.analytics.dto;

import java.math.BigDecimal;

public record KpiSummary (
    long todayEntrances,
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
