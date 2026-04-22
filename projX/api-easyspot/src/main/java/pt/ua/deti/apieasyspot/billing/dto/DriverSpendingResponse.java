package pt.ua.deti.apieasyspot.billing.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record DriverSpendingResponse(
    Totals totals,
    Insights insights,
    List<TimeseriesPoint> timeseries,
    List<ParkBreakdown> breakdownByPark,
    List<VehicleBreakdown> breakdownByVehicle,
    List<HistoryItem> history
) {

    public record Totals(
        BigDecimal totalSpent,
        BigDecimal avgPerSession,
        BigDecimal parkingSpent,
        BigDecimal chargingSpent
    ) {}

    public record Insights(
        String mostUsedPark,
        CostliestSession costliestSession,
        long sessionCount
    ) {}

    public record CostliestSession(
        String parkName,
        OffsetDateTime date,
        String vehicle,
        BigDecimal totalSpent
    ) {}

    public record TimeseriesPoint(
        LocalDate date,
        BigDecimal totalSpent
    ) {}

    public record ParkBreakdown(
        UUID parkId,
        String parkName,
        BigDecimal totalSpent
    ) {}

    public record VehicleBreakdown(
        UUID vehicleId,
        String licensePlate,
        BigDecimal totalSpent
    ) {}

    public record HistoryItem(
        String parkName,
        OffsetDateTime date,
        long durationMinutes,
        String vehicle,
        BigDecimal totalSpent,
        String status
    ) {}
}
