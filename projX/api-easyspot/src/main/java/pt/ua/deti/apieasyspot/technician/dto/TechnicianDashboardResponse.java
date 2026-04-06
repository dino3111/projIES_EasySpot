package pt.ua.deti.apieasyspot.technician.dto;

import java.util.List;

public record TechnicianDashboardResponse(
    TechnicianKpiSummary kpis,
    List<DailyUptimeDto> uptimeLast7Days,
    List<SensorStatusDto> sensorDistribution,
    List<WorkOrderSummary> urgentWorkOrders
) {}
