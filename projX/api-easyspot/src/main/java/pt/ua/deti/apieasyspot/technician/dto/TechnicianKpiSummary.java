package pt.ua.deti.apieasyspot.technician.dto;

public record TechnicianKpiSummary(
    int totalSensors,
    int operationalSensors,
    double uptimePct,
    long failuresToday,
    double failuresVariance,
    String meanTimeToRepair,
    double mttrVariance
) {}
