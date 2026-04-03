package pt.ua.deti.apieasyspot.analytics.dto;

import java.util.List;

public record ManagerDashboardResponse(
    KpiSummary kpis,
    List<DailyMetric> seriesLast7Days,
    List<ZoneOccupancyDto> occupancyPerZone,
    List<HourlyOccupancyDto> occupancyPerHour,
    List<AlertSummary> lastAlerts,
    List<ParkSummary> performancePerPark
) {}
