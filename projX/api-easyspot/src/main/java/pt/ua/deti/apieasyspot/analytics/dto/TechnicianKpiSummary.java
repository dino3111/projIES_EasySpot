package pt.ua.deti.apieasyspot.analytics.dto;

public record TechnicianKpiSummary(
    int totalSensors,
    int operationalSensors,
    double uptimePct,
    long failuresToday,
    double failuresVariance,
    String meanTimeToRepair,
    double mttrVariance
) {}
