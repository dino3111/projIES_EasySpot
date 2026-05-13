package pt.ua.deti.apieasyspot.vehicle.dto;

public record InsuranceData(
    String entity,
    String startDate,
    String endDate,
    String policy,
    String license,
    String logo
) {}
