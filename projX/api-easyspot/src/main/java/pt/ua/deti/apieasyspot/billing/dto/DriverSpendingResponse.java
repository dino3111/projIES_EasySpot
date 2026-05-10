package pt.ua.deti.apieasyspot.billing.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record DriverSpendingResponse(
    @Schema(description = "Top-level totals for selected filters")
    Totals totals,
    @Schema(description = "Derived insights for selected period")
    Insights insights,
    @Schema(description = "Daily spending time-series")
    List<TimeseriesPoint> timeseries,
    @Schema(description = "Total spent grouped by park")
    List<ParkBreakdown> breakdownByPark,
    @Schema(description = "Total spent grouped by vehicle")
    List<VehicleBreakdown> breakdownByVehicle,
    @Schema(description = "Detailed session history")
    List<HistoryItem> history,
    @Schema(description = "Total number of history items (for pagination)", example = "47")
    long historyTotal
) {

    public record Totals(
        @Schema(description = "Total amount spent in selected period", example = "73.40")
        BigDecimal totalSpent,
        @Schema(description = "Average amount per session", example = "6.12")
        BigDecimal avgPerSession,
        @Schema(description = "Parking-only spending", example = "58.10")
        BigDecimal parkingSpent,
        @Schema(description = "EV charging spending", example = "15.30")
        BigDecimal chargingSpent
    ) {}

    public record Insights(
        @Schema(description = "Most frequently used park name", example = "Fórum Aveiro", nullable = true)
        String mostUsedPark,
        @Schema(description = "Most expensive session in selected period", nullable = true)
        CostliestSession costliestSession,
        @Schema(description = "Number of sessions considered", example = "12")
        long sessionCount
    ) {}

    public record CostliestSession(
        @Schema(description = "Park name", example = "Glicínias Plaza")
        String parkName,
        @Schema(description = "Session date/time", example = "2026-04-18T14:45:00Z")
        OffsetDateTime date,
        @Schema(description = "Vehicle identifier shown to the user", example = "AA-00-AA", nullable = true)
        String vehicle,
        @Schema(description = "Session total spent", example = "12.80")
        BigDecimal totalSpent
    ) {}

    public record TimeseriesPoint(
        @Schema(description = "Day bucket", example = "2026-04-18")
        LocalDate date,
        @Schema(description = "Total spent on this day", example = "9.50")
        BigDecimal totalSpent
    ) {}

    public record ParkBreakdown(
        @Schema(description = "Park ID", example = "5dc3614a-7528-4231-a729-83d689ec3f67")
        UUID parkId,
        @Schema(description = "Park name", example = "Fórum Aveiro")
        String parkName,
        @Schema(description = "Total spent in this park", example = "31.20")
        BigDecimal totalSpent
    ) {}

    public record VehicleBreakdown(
        @Schema(description = "Vehicle ID", example = "9f6a9a7b-c6a2-43a2-a2b6-f57e6d03df57")
        UUID vehicleId,
        @Schema(description = "Vehicle license plate", example = "AA-00-AA")
        String licensePlate,
        @Schema(description = "Total spent by this vehicle", example = "42.20")
        BigDecimal totalSpent
    ) {}

    public record HistoryItem(
        @Schema(description = "Park name", example = "Fórum Aveiro")
        String parkName,
        @Schema(description = "Session start date/time", example = "2026-04-18T10:30:00Z")
        OffsetDateTime date,
        @Schema(description = "Session duration in minutes", example = "95")
        long durationMinutes,
        @Schema(description = "Vehicle identifier shown to the user", example = "AA-00-AA", nullable = true)
        String vehicle,
        @Schema(description = "Session total spent", example = "7.40")
        BigDecimal totalSpent,
        @Schema(description = "Billing/session status", example = "COMPLETED")
        String status
    ) {}
}
