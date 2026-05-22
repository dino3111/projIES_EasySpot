package pt.ua.deti.apieasyspot.sensor.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record SensorBootstrapContextDto(
    int version,
    OffsetDateTime generatedAt,
    List<ParkItem> parkingLots,
    List<SpotItem> parkingSpots,
    List<SensorItem> sensors,
    List<UserItem> users,
    List<VehicleItem> vehicles,
    List<ReservationItem> activeReservations
) {
    public record ParkItem(UUID id, String name, String city) {}
    public record SpotItem(UUID id, UUID parkingLotId, String spotNumber, String zone, Integer row, Integer col, String status) {}
    public record SensorItem(String sensorId, UUID parkingLotId, String zone, String status) {}
    public record UserItem(UUID id, String authentikUserId, String role) {}
    public record VehicleItem(UUID id, UUID userId, String plate, boolean isEv, boolean isAccessible) {}
    public record ReservationItem(UUID id, UUID userId, UUID parkingLotId, UUID parkingSpotId, UUID vehicleId, String status, OffsetDateTime arrivalTime, OffsetDateTime departureTime) {}

    public record ReservationSnapshotDto(
        int version,
        OffsetDateTime generatedAt,
        List<ReservationItem> activeReservations
    ) {}

    public record BaseSnapshotDto(
        int version,
        OffsetDateTime generatedAt,
        List<ParkItem> parkingLots,
        List<SpotItem> parkingSpots,
        List<VehicleItem> vehicles
    ) {}
}
