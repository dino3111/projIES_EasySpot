package pt.ua.deti.apieasyspot.occupancy.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;
import pt.ua.deti.apieasyspot.occupancy.dto.ParkingLotDetailsResponse;
import pt.ua.deti.apieasyspot.occupancy.dto.ParkingLotSummaryResponse;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.model.Tariff;
import pt.ua.deti.apieasyspot.occupancy.model.ZoneType;
import pt.ua.deti.apieasyspot.occupancy.repository.TimescaleOccupancySnapshotRepository.ZoneSnapshot;
import pt.ua.deti.apieasyspot.occupancy.repository.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

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
            .sorted(java.util.Comparator.comparing(ParkingLotSummaryResponse.ParkingLotSummary::name))
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
        if (snapshots.isEmpty()) {
            return new Availability(lot.getTotalSpaces(), lot.getTotalSpaces(), 0, 0, 0, 0);
        }
        int totalSpaces = snapshots.stream().mapToInt(ZoneSnapshot::totalCount).sum();
        int freeSpaces = snapshots.stream().mapToInt(s -> Math.max(0, s.totalCount() - s.occupiedCount())).sum();
        int evTotal = sumForZone(snapshots, ZoneType.EV, ZoneSnapshot::totalCount);
        int evFree = sumForZone(snapshots, ZoneType.EV, s -> Math.max(0, s.totalCount() - s.occupiedCount()));
        int accTotal = sumForZone(snapshots, ZoneType.ACCESSIBLE, ZoneSnapshot::totalCount);
        int accFree = sumForZone(snapshots, ZoneType.ACCESSIBLE, s -> Math.max(0, s.totalCount() - s.occupiedCount()));
        return new Availability(totalSpaces, freeSpaces, evTotal, evFree, accTotal, accFree);
    }

    private int sumForZone(List<ZoneSnapshot> snapshots, ZoneType zoneType, java.util.function.ToIntFunction<ZoneSnapshot> extractor) {
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

        List<ParkingLotDetailsResponse.ZoneResponse> zones = fetchZones(id);
        int freeSpaces = zones.stream().mapToInt(ParkingLotDetailsResponse.ZoneResponse::free).sum();

        return new ParkingLotDetailsResponse(
            lot.getId(),
            lot.getName(),
            lot.getAddress(),
            new ParkingLotDetailsResponse.CoordinatesResponse(lot.getLatitude(), lot.getLongitude()),
            lot.getOpeningHours(),
            lot.getTotalSpaces(),
            freeSpaces,
            zones,
            fetchSpots(id),
            fetchEVChargers(id),
            fetchAccessibility(id),
            fetchTariffs(id),
            lot.getAmenities()
        );
    }

    private List<ParkingLotDetailsResponse.ZoneResponse> fetchZones(UUID lotId) {
        return timescaleOccupancySnapshotRepository.latestByLot(lotId).stream()
            .map(snapshot -> {
                int free = Math.max(0, snapshot.totalCount() - snapshot.occupiedCount());
                int pct = snapshot.totalCount() > 0
                    ? (int) Math.round((double) snapshot.occupiedCount() / snapshot.totalCount() * 100)
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
                s.getSpotNumber(), s.getZone().name(), s.getSpotRow(), s.getSpotCol(), s.getStatus()))
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

    private record Availability(
        int totalSpaces,
        int freeSpaces,
        int evTotal,
        int evFree,
        int accTotal,
        int accFree
    ) {}
}
