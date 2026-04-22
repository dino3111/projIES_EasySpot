package pt.ua.deti.apieasyspot.occupancy.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record ParkingLotDetailsResponse(
    UUID id,
    String name,
    String address,
    CoordinatesResponse coordinates,
    String openingHours,
    int totalSpaces,
    int freeSpaces,
    List<ZoneResponse> zones,
    List<SpotResponse> spotMap,
    List<EVChargerResponse> evChargers,
    List<AccessibilityResponse> accessibility,
    List<TariffResponse> tariffs,
    List<String> amenities
) {
    public record CoordinatesResponse(Double lat, Double lng) {}
    
    public record ZoneResponse(String zoneName, int total, int free, int occupancyPercent) {}
    
    public record SpotResponse(String spotNumber, String zone, int row, int col, String status) {}
    
    public record EVChargerResponse(String type, String speed, BigDecimal pricePerKwh, boolean availability) {}
    
    public record AccessibilityResponse(String location, boolean availability, int distanceToEntranceMeters, String baySize) {}
    
    public record TariffResponse(String name, String description, BigDecimal pricePerHour, BigDecimal maxDaily, BigDecimal monthly, BigDecimal pricePerKwh) {}
}
