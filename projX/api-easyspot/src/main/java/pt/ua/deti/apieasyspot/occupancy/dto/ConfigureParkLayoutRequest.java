package pt.ua.deti.apieasyspot.occupancy.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;
import java.util.List;

public record ConfigureParkLayoutRequest(
    List<String> amenities,
    @Valid List<ParkingSpotSeedRequest> spots,
    @Valid List<EvChargerSeedRequest> evChargers,
    @Valid List<AccessibleSpotSeedRequest> accessibleSpots
) {
    public record ParkingSpotSeedRequest(
        @NotBlank String spotNumber,
        @NotBlank String zone,
        @Min(1) int row,
        @Min(1) int col,
        String status
    ) {}

    public record EvChargerSeedRequest(
        @NotBlank String type,
        @NotBlank String speed,
        BigDecimal pricePerKwh,
        Boolean available
    ) {}

    public record AccessibleSpotSeedRequest(
        @NotBlank String location,
        Boolean available,
        @Min(0) Integer distanceToEntranceMeters,
        String baySize,
        Boolean monitored,
        Boolean hasRampSpace,
        String sensorStatus,
        String ledStatus
    ) {}
}
