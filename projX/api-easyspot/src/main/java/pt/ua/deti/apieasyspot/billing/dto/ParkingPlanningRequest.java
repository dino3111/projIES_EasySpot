package pt.ua.deti.apieasyspot.billing.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ParkingPlanningRequest(
    String city,
    @Min(1) int estimatedDurationMinutes,
    Boolean isElectric,
    Boolean isAccessible,
    @DecimalMin("0.0") double maxDistanceMeters,
    @NotNull @Valid LocationRequest location,
    OrderBy orderBy
) {
    public record LocationRequest(
        @NotNull Double lat,
        @NotNull Double lng
    ) {}

    public enum OrderBy {
        BEST, LOWEST_PRICE, NEAREST
    }

    public OrderBy effectiveOrderBy() {
        return orderBy != null ? orderBy : OrderBy.BEST;
    }
}
