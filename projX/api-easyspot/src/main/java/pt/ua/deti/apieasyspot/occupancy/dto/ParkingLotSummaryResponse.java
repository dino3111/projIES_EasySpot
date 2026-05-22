package pt.ua.deti.apieasyspot.occupancy.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record ParkingLotSummaryResponse(
    List<ParkingLotSummary> items,
    PaginationInfo pagination
) {
    public record ParkingLotSummary(
        UUID id,
        String name,
        String city,
        String address,
        Double latitude,
        Double longitude,
        String openingHours,
        BigDecimal pricePerHour,
        int totalSpaces,
        int freeSpaces,
        CountInfo evChargers,
        AccessibleInfo accessibleSpaces,
        String currentAvailabilityStatus
    ) {}

    public record CountInfo(int available, int total) {}
    public record AccessibleInfo(int available, int total, Integer minDistanceMeters) {}

    public record PaginationInfo(
        int page,
        int pageSize,
        long totalItems,
        int totalPages
    ) {}
}
