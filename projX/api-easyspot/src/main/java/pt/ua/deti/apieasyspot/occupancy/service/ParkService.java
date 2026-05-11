package pt.ua.deti.apieasyspot.occupancy.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import pt.ua.deti.apieasyspot.booking.repository.ReservationRepository;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;
import pt.ua.deti.apieasyspot.occupancy.dto.ParkingLotDetailsResponse;
import pt.ua.deti.apieasyspot.occupancy.dto.ParkingLotSummaryResponse;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingSpot;
import pt.ua.deti.apieasyspot.occupancy.model.Tariff;
import pt.ua.deti.apieasyspot.occupancy.model.ZoneType;
import pt.ua.deti.apieasyspot.occupancy.repository.TimescaleOccupancySnapshotRepository.ZoneSnapshot;
import pt.ua.deti.apieasyspot.occupancy.repository.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.ToIntFunction;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ParkService {

    private final ParkingLotRepository parkingLotRepository;
    private final TariffRepository tariffRepository;
    private final EVChargerRepository evChargerRepository;
    private final AccessibleSpotRepository accessibleSpotRepository;
    private final ParkingSpotRepository parkingSpotRepository;
    private final @Qualifier("jdbcTemplate") JdbcTemplate jdbc;
    private final TimescaleOccupancySnapshotRepository timescaleOccupancySnapshotRepository;
    private final ReservationRepository reservationRepository;

    public ParkingLotSummaryResponse searchParks(String textQuery, Integer minAvailableSpaces, String city, List<String> filters, int page, int pageSize) {
        boolean filterEV = filters != null && filters.contains("EV");
        boolean filterAcc = filters != null && filters.contains("ACCESSIBLE");
        List<ParkingLot> allLots = parkingLotRepository.findAll().stream()
            .filter(lot -> matchesText(lot, textQuery))
            .filter(lot -> matchesCity(lot, city))
            .toList();

        Map<UUID, List<ZoneSnapshot>> snapshotsByLot = timescaleOccupancySnapshotRepository.latestByLotIds(
            allLots.stream().map(ParkingLot::getId).toList()
        );

        List<ParkingLotSummaryResponse.ParkingLotSummary> filtered = allLots.stream()
            .map(lot -> toSummary(lot, snapshotsByLot.getOrDefault(lot.getId(), List.of())))
            .filter(summary -> minAvailableSpaces == null || summary.freeSpaces() >= minAvailableSpaces)
            .filter(summary -> !filterEV || summary.evChargers().total() > 0)
            .filter(summary -> !filterAcc || summary.accessibleSpaces().total() > 0)
            .sorted(Comparator.comparing(ParkingLotSummaryResponse.ParkingLotSummary::name))
            .toList();

        long totalItems = filtered.size();
        int offset = Math.max(0, (page - 1) * pageSize);
        int toIndex = Math.min(filtered.size(), offset + pageSize);
        List<ParkingLotSummaryResponse.ParkingLotSummary> items =
            offset >= filtered.size() ? List.of() : filtered.subList(offset, toIndex);

        int totalPages = totalItems == 0 ? 0 : (int) Math.ceil((double) totalItems / pageSize);
        return new ParkingLotSummaryResponse(
            items,
            new ParkingLotSummaryResponse.PaginationInfo(page, pageSize, totalItems, totalPages)
        );
    }

    public List<String> listCities() {
        return jdbc.query(
            "SELECT DISTINCT city FROM parking_lots WHERE city IS NOT NULL AND city <> '' ORDER BY city ASC",
            (rs, rowNum) -> rs.getString("city")
        );
    }

    private ParkingLotSummaryResponse.ParkingLotSummary toSummary(ParkingLot lot, List<ZoneSnapshot> snapshots) {
        Availability availability = availabilityFor(lot, snapshots);
        return new ParkingLotSummaryResponse.ParkingLotSummary(
            lot.getId(),
            lot.getName(),
            lot.getCity(),
            lot.getAddress(),
            lot.getLatitude(),
            lot.getLongitude(),
            lot.getOpeningHours(),
            minPrice(lot.getId()),
            availability.totalSpaces(),
            availability.freeSpaces(),
            new ParkingLotSummaryResponse.CountInfo(availability.evFree(), availability.evTotal()),
            new ParkingLotSummaryResponse.CountInfo(availability.accFree(), availability.accTotal()),
            classifyAvailability(availability.freeSpaces(), availability.totalSpaces())
        );
    }

    private BigDecimal minPrice(UUID lotId) {
        return tariffRepository.findByParkingLotId(lotId).stream()
            .map(Tariff::getPricePerHour)
            .filter(Objects::nonNull)
            .min(BigDecimal::compareTo)
            .orElse(null);
    }

    private Availability availabilityFor(ParkingLot lot, List<ZoneSnapshot> snapshots) {
        OffsetDateTime now = OffsetDateTime.now();
        long activeRes = reservationRepository.countLotReservations(lot.getId(), now, now.plusMinutes(30));

        if (snapshots.isEmpty()) {
            int free = Math.max(0, lot.getTotalSpaces() - (int) activeRes);
            return new Availability(lot.getTotalSpaces(), free, 0, 0, 0, 0);
        }

        int totalSpaces = snapshots.stream().mapToInt(ZoneSnapshot::totalCount).sum();
        int sensorFree = snapshots.stream().mapToInt(s -> Math.max(0, s.totalCount() - s.occupiedCount())).sum();
        int freeSpaces = Math.max(0, sensorFree - (int) activeRes);

        int evTotal = sumForZone(snapshots, ZoneType.EV, ZoneSnapshot::totalCount);
        // Sensor already reflects physical occupancy for EV zone; no reservation offset at zone level
        int evFree = sumForZone(snapshots, ZoneType.EV, s -> Math.max(0, s.totalCount() - s.occupiedCount()));

        int accTotal = sumForZone(snapshots, ZoneType.ACCESSIBLE, ZoneSnapshot::totalCount);
        int accFree = sumForZone(snapshots, ZoneType.ACCESSIBLE, s -> Math.max(0, s.totalCount() - s.occupiedCount()));

        return new Availability(totalSpaces, freeSpaces, evTotal, evFree, accTotal, accFree);
    }

    private int sumForZone(List<ZoneSnapshot> snapshots, ZoneType zoneType, ToIntFunction<ZoneSnapshot> extractor) {
        return snapshots.stream()
            .filter(snapshot -> snapshot.zoneType() == zoneType)
            .mapToInt(extractor)
            .sum();
    }

    private boolean matchesText(ParkingLot lot, String textQuery) {
        if (textQuery == null || textQuery.isBlank()) return true;
        String query = textQuery.toLowerCase();
        return lot.getName().toLowerCase().contains(query)
            || lot.getCity().toLowerCase().contains(query)
            || lot.getAddress().toLowerCase().contains(query);
    }

    private boolean matchesCity(ParkingLot lot, String city) {
        if (city == null || city.isBlank()) return true;
        return lot.getCity().equalsIgnoreCase(city.trim());
    }

    private String classifyAvailability(int free, int total) {
        if (free == 0) return "FULL";
        if (total > 0 && (double) free / total < 0.1) return "LIMITED";
        return "AVAILABLE";
    }

    public ParkingLotDetailsResponse getDetails(UUID id) {
        ParkingLot lot = parkingLotRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Parking lot not found: " + id));

        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime windowEnd = now.plusMinutes(30);

        List<ParkingSpot> spots = parkingSpotRepository.findByParkingLotId(id);
        List<UUID> freeSpotIds = spots.stream()
            .filter(s -> "free".equalsIgnoreCase(s.getStatus()))
            .map(ParkingSpot::getId)
            .toList();
        Set<UUID> reservedSpotIds = freeSpotIds.isEmpty()
            ? Set.of()
            : Set.copyOf(reservationRepository.findReservedSpotIds(freeSpotIds, now, windowEnd));

        // Count reservations per zone using spot zone info so fetchZones can subtract them
        Map<ZoneType, Long> reservedCountByZone = reservedSpotIds.isEmpty()
            ? Map.of()
            : spots.stream()
                .filter(s -> reservedSpotIds.contains(s.getId()))
                .collect(Collectors.groupingBy(ParkingSpot::getZone, Collectors.counting()));

        List<ParkingLotDetailsResponse.ZoneResponse> zones = fetchZones(id, reservedCountByZone);
        int freeSpaces = zones.stream().mapToInt(ParkingLotDetailsResponse.ZoneResponse::free).sum();

        List<ParkingLotDetailsResponse.SpotResponse> spotResponses = spots.stream()
            .map(s -> {
                String status = s.getStatus();
                if ("free".equalsIgnoreCase(status) && reservedSpotIds.contains(s.getId())) {
                    status = "reserved";
                }
                return new ParkingLotDetailsResponse.SpotResponse(
                    s.getId(), s.getSpotNumber(), s.getZone().name(), s.getSpotRow(), s.getSpotCol(), status);
            })
            .toList();

        return new ParkingLotDetailsResponse(
            lot.getId(),
            lot.getName(),
            lot.getAddress(),
            new ParkingLotDetailsResponse.CoordinatesResponse(lot.getLatitude(), lot.getLongitude()),
            lot.getOpeningHours(),
            lot.getTotalSpaces(),
            freeSpaces,
            zones,
            spotResponses,
            fetchEVChargers(id),
            fetchAccessibility(id),
            fetchTariffs(id),
            lot.getAmenities()
        );
    }

    private List<ParkingLotDetailsResponse.ZoneResponse> fetchZones(UUID lotId, Map<ZoneType, Long> reservedCountByZone) {
        return timescaleOccupancySnapshotRepository.latestByLot(lotId).stream()
            .map(snapshot -> {
                int sensorFree = Math.max(0, snapshot.totalCount() - snapshot.occupiedCount());
                int reserved = reservedCountByZone.getOrDefault(snapshot.zoneType(), 0L).intValue();
                int free = Math.max(0, sensorFree - reserved);
                int effectiveOccupied = snapshot.totalCount() - free;
                int pct = snapshot.totalCount() > 0
                    ? (int) Math.round((double) effectiveOccupied / snapshot.totalCount() * 100)
                    : 0;
                return new ParkingLotDetailsResponse.ZoneResponse(
                    snapshot.zoneType().name(), snapshot.totalCount(), free, pct
                );
            })
            .toList();
    }

    private List<ParkingLotDetailsResponse.SpotResponse> fetchSpots(UUID lotId) {
        return parkingSpotRepository.findByParkingLotId(lotId).stream()
            .map(s -> new ParkingLotDetailsResponse.SpotResponse(
                s.getId(), s.getSpotNumber(), s.getZone().name(), s.getSpotRow(), s.getSpotCol(), s.getStatus()))
            .toList();
    }

    private List<ParkingLotDetailsResponse.EVChargerResponse> fetchEVChargers(UUID lotId) {
        return evChargerRepository.findByParkingLotId(lotId).stream()
            .map(c -> new ParkingLotDetailsResponse.EVChargerResponse(
                c.getType(), c.getSpeed(), c.getPricePerKwh(), c.isAvailable()))
            .toList();
    }

    private List<ParkingLotDetailsResponse.AccessibilityResponse> fetchAccessibility(UUID lotId) {
        return accessibleSpotRepository.findByParkingLotId(lotId).stream()
            .map(a -> new ParkingLotDetailsResponse.AccessibilityResponse(
                a.getLocation(), a.isAvailable(), a.getDistanceToEntranceMeters(), a.getBaySize()))
            .toList();
    }

    private List<ParkingLotDetailsResponse.TariffResponse> fetchTariffs(UUID lotId) {
        return tariffRepository.findByParkingLotId(lotId).stream()
            .map(t -> new ParkingLotDetailsResponse.TariffResponse(
                t.getName(), t.getDescription(), t.getPricePerHour(), t.getMaxDaily(), t.getMonthly(), t.getPricePerKwh()))
            .toList();
    }

    public List<Map<String, Object>> getHourlyOccupancy(UUID id) {
        if (!parkingLotRepository.existsById(id)) {
            throw new pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException("Parking lot not found: " + id);
        }
        List<TimescaleOccupancySnapshotRepository.HourlyOccupancyPoint> points =
            timescaleOccupancySnapshotRepository.hourlyOccupancyLast7Days(List.of(id))
                .getOrDefault(id, List.of());

        List<Map<String, Object>> result = new ArrayList<>();
        for (TimescaleOccupancySnapshotRepository.HourlyOccupancyPoint p : points.stream()
                .sorted(Comparator.comparingInt(TimescaleOccupancySnapshotRepository.HourlyOccupancyPoint::hourOfDay))
                .toList()) {
            result.add(Map.of(
                "hour", String.format("%02dh", p.hourOfDay()),
                "occupancyPercent", p.occupancyPercent()
            ));
        }
        return result;
    }

    private record Availability(
        int totalSpaces,
        int freeSpaces,
        int evTotal,
        int evFree,
        int accTotal,
        int accFree
    ) {}
}
