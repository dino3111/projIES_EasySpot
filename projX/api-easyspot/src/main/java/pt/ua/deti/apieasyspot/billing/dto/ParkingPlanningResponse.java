package pt.ua.deti.apieasyspot.billing.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record ParkingPlanningResponse(List<ParkingSummary> recommendations) {

    public record ParkingSummary(
        UUID id,
        String name,
        String openingHours,
        double distanceMeters,
        String address,
        BigDecimal pricePerHour,
        OccupancyInfo currentOccupancy,
        List<HourlyOccupancy> occupancyByHour
    ) {}

    public record OccupancyInfo(int occupied, int total, int occupancyPercent, String status) {}

    public record HourlyOccupancy(String hour, int occupancyPercent) {}
}
