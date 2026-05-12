package pt.ua.deti.apieasyspot.occupancy.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import pt.ua.deti.apieasyspot.booking.repository.ReservationRepository;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;
import pt.ua.deti.apieasyspot.occupancy.dto.ParkingLotDetailsResponse;
import pt.ua.deti.apieasyspot.occupancy.dto.ParkingLotSummaryResponse;
import pt.ua.deti.apieasyspot.booking.model.Reservation;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingSpot;
import pt.ua.deti.apieasyspot.occupancy.model.Tariff;
import pt.ua.deti.apieasyspot.occupancy.model.ZoneType;
import pt.ua.deti.apieasyspot.occupancy.repository.TimescaleOccupancySnapshotRepository.ZoneSnapshot;
import pt.ua.deti.apieasyspot.occupancy.repository.*;

import java.math.BigDecimal;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
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

    private static final String STATUS_FREE = "free";
    private static final String STATUS_RESERVED = "reserved";
    private static final String STATUS_OCCUPIED = "occupied";
    private static final String LOT_NOT_FOUND_MSG = "Parking lot not found: ";
    private static final Pattern SPEED_KW_PATTERN = Pattern.compile("(\\d+)\\s*[kK][wW]");

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
        List<UUID> lotIds = allLots.stream().map(ParkingLot::getId).toList();

        Map<UUID, List<ParkingSpot>> spotsByLot = parkingSpotRepository.findByParkingLotIdIn(lotIds).stream()
            .collect(Collectors.groupingBy(spot -> spot.getParkingLot().getId()));
        Map<UUID, List<Reservation>> reservationsByLot = lotIds.isEmpty()
            ? Map.of()
            : reservationRepository.findActiveWithSpotByParkIds(lotIds).stream()
                .collect(Collectors.groupingBy(reservation -> reservation.getParkingLot().getId()));
        OffsetDateTime now = OffsetDateTime.now();

        Set<UUID> lotsWithEV = filterEV
            ? evChargerRepository.findAll().stream().map(c -> c.getParkingLot().getId()).collect(java.util.stream.Collectors.toSet())
            : Set.of();
        Set<UUID> lotsWithAcc = filterAcc
            ? accessibleSpotRepository.findAll().stream().map(a -> a.getParkingLot().getId()).collect(java.util.stream.Collectors.toSet())
            : Set.of();

        List<ParkingLotSummaryResponse.ParkingLotSummary> filtered = allLots.stream()
            .filter(lot -> !filterEV || lotsWithEV.contains(lot.getId()))
            .filter(lot -> !filterAcc || lotsWithAcc.contains(lot.getId()))
            .map(lot -> toSummary(
                lot,
                timescaleOccupancySnapshotRepository.latestByLot(lot.getId()),
                spotsByLot.getOrDefault(lot.getId(), List.of()),
                reservationsByLot.getOrDefault(lot.getId(), List.of()),
                now
            ))
            .filter(summary -> minAvailableSpaces == null || summary.freeSpaces() >= minAvailableSpaces)
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

    private ParkingLotSummaryResponse.ParkingLotSummary toSummary(
        ParkingLot lot,
        List<ZoneSnapshot> snapshots,
        List<ParkingSpot> spots,
        List<Reservation> reservations,
        OffsetDateTime now
    ) {
        Availability availability = availabilityFor(lot, snapshots, spots, reservations, now);
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

    private Availability availabilityFor(
        ParkingLot lot,
        List<ZoneSnapshot> snapshots,
        List<ParkingSpot> spots,
        List<Reservation> reservations,
        OffsetDateTime now
    ) {
        if (!spots.isEmpty()) {
            Map<UUID, String> statusBySpot = buildStatusBySpot(spots, reservations, snapshots, now);
            List<ParkingLotDetailsResponse.ZoneResponse> zones = buildZonesFromSpotStatuses(spots, statusBySpot);
            int totalSpaces = zones.stream().mapToInt(ParkingLotDetailsResponse.ZoneResponse::total).sum();
            int freeSpaces = zones.stream().mapToInt(ParkingLotDetailsResponse.ZoneResponse::free).sum();
            int evTotal = zoneTotal(zones, ZoneType.EV);
            int evFree = zoneFree(zones, ZoneType.EV);
            int accTotal = zoneTotal(zones, ZoneType.ACCESSIBLE);
            int accFree = zoneFree(zones, ZoneType.ACCESSIBLE);
            return new Availability(totalSpaces, freeSpaces, evTotal, evFree, accTotal, accFree);
        }

        long activeRes = reservationRepository.countActiveReservationsForLot(lot.getId(), now);

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
            .orElseThrow(() -> new ResourceNotFoundException(LOT_NOT_FOUND_MSG + id));

        OffsetDateTime now = OffsetDateTime.now();

        List<ParkingSpot> spots = parkingSpotRepository.findByParkingLotId(id);
        List<Reservation> activeReservations = reservationRepository.findActiveWithSpotByParkId(id);
        List<ZoneSnapshot> snapshots = timescaleOccupancySnapshotRepository.latestByLot(id);
        Map<UUID, String> statusBySpot = buildStatusBySpot(spots, activeReservations, snapshots, now);

        List<ParkingLotDetailsResponse.ZoneResponse> zones = buildZonesFromSpotStatuses(spots, statusBySpot);
        int totalSpaces = zones.stream().mapToInt(ParkingLotDetailsResponse.ZoneResponse::total).sum();
        int freeSpaces = zones.stream().mapToInt(ParkingLotDetailsResponse.ZoneResponse::free).sum();

        List<ParkingLotDetailsResponse.SpotResponse> spotResponses = spots.stream()
            .map(s -> {
                String status = statusBySpot.getOrDefault(s.getId(), s.getStatus());
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
            totalSpaces > 0 ? totalSpaces : lot.getTotalSpaces(),
            freeSpaces,
            zones,
            spotResponses,
            fetchEVChargers(id),
            fetchAccessibility(id),
            fetchTariffs(id),
            lot.getAmenities()
        );
    }

    private List<ParkingLotDetailsResponse.ZoneResponse> buildZonesFromSpotStatuses(
        List<ParkingSpot> spots,
        Map<UUID, String> statusBySpot
    ) {
        return spots.stream()
            .collect(Collectors.groupingBy(ParkingSpot::getZone))
            .entrySet().stream()
            .sorted(Map.Entry.comparingByKey())
            .map(entry -> {
                int total = entry.getValue().size();
                int free = (int) entry.getValue().stream()
                    .map(spot -> statusBySpot.getOrDefault(spot.getId(), restoreSpotBaseStatus(spot)))
                    .filter(this::countsAsFree)
                    .count();
                int occupied = total - free;
                int pct = total > 0
                    ? (int) Math.round((double) occupied / total * 100)
                    : 0;
                return new ParkingLotDetailsResponse.ZoneResponse(entry.getKey().name(), total, free, pct);
            })
            .toList();
    }

    private Map<UUID, String> buildStatusBySpot(
        List<ParkingSpot> spots,
        List<Reservation> activeReservations,
        List<ZoneSnapshot> snapshots,
        OffsetDateTime now
    ) {
        Map<UUID, Reservation> activeReservationsBySpot = activeReservations.stream()
            .collect(Collectors.toMap(
                r -> r.getParkingSpot().getId(),
                r -> r,
                (left, right) -> left.getArrivalTime().isBefore(right.getArrivalTime()) ? left : right
            ));

        Map<UUID, String> statusBySpot = new java.util.HashMap<>();
        for (ParkingSpot spot : spots) {
            String status = deriveSpotStatus(spot, activeReservationsBySpot.get(spot.getId()), now);
            statusBySpot.put(spot.getId(), status);
        }

        Map<ZoneType, ZoneSnapshot> snapshotByZone = snapshots.stream()
            .collect(Collectors.toMap(ZoneSnapshot::zoneType, s -> s, (a, b) -> a));

        Map<ZoneType, List<ParkingSpot>> freeSpotsByZone = spots.stream()
            .filter(s -> isCandidateForSensorProjection(statusBySpot.get(s.getId())))
            .collect(Collectors.groupingBy(ParkingSpot::getZone));

        for (Map.Entry<ZoneType, ZoneSnapshot> entry : snapshotByZone.entrySet()) {
            ZoneType zone = entry.getKey();
            ZoneSnapshot snapshot = entry.getValue();
            int alreadyUnavailableInZone = countUnavailableSpotsForZone(statusBySpot, zone, spots);
            int sensorOccupied = snapshot.occupiedCount();
            int unaccountedOccupied = Math.max(0, sensorOccupied - alreadyUnavailableInZone);

            List<ParkingSpot> freeSpots = freeSpotsByZone.getOrDefault(zone, List.of()).stream()
                .sorted(Comparator.comparing(ParkingSpot::getId))
                .toList();

            int toMark = Math.min(unaccountedOccupied, freeSpots.size());
            for (int i = 0; i < toMark; i++) {
                statusBySpot.put(freeSpots.get(i).getId(), STATUS_OCCUPIED);
            }
        }

        return statusBySpot;
    }

    private int zoneTotal(List<ParkingLotDetailsResponse.ZoneResponse> zones, ZoneType zoneType) {
        return zones.stream()
            .filter(zone -> zone.zoneName().equalsIgnoreCase(zoneType.name()))
            .mapToInt(ParkingLotDetailsResponse.ZoneResponse::total)
            .sum();
    }

    private int zoneFree(List<ParkingLotDetailsResponse.ZoneResponse> zones, ZoneType zoneType) {
        return zones.stream()
            .filter(zone -> zone.zoneName().equalsIgnoreCase(zoneType.name()))
            .mapToInt(ParkingLotDetailsResponse.ZoneResponse::free)
            .sum();
    }

    private int countUnavailableSpotsForZone(Map<UUID, String> statusBySpot, ZoneType zone, List<ParkingSpot> spots) {
        return (int) spots.stream()
            .filter(spot -> spot.getZone() == zone)
            .map(spot -> statusBySpot.getOrDefault(spot.getId(), restoreSpotBaseStatus(spot)))
            .filter(status -> !countsAsFree(status))
            .count();
    }

    private boolean countsAsFree(String status) {
        return STATUS_FREE.equalsIgnoreCase(status)
            || "ev".equalsIgnoreCase(status)
            || "accessible".equalsIgnoreCase(status);
    }

    private String deriveSpotStatus(ParkingSpot spot, Reservation reservation, OffsetDateTime now) {
        if (reservation == null) {
            return restoreSpotBaseStatus(spot);
        }

        if (now.isAfter(reservation.getDepartureTime())) {
            return restoreSpotBaseStatus(spot);
        }

        if (now.isBefore(reservation.getArrivalTime())) {
            return STATUS_RESERVED;
        }

        return STATUS_OCCUPIED;
    }

    private String normalizeSpotStatus(String currentStatus) {
        if (!StringUtils.hasText(currentStatus)) {
            return STATUS_FREE;
        }
        String normalized = currentStatus.trim().toLowerCase();
        return switch (normalized) {
            case STATUS_FREE, STATUS_RESERVED, STATUS_OCCUPIED, "ev", "accessible" -> normalized;
            default -> STATUS_FREE;
        };
    }

    private String restoreSpotBaseStatus(ParkingSpot spot) {
        if (spot.getZone() == ZoneType.EV) return "ev";
        if (spot.getZone() == ZoneType.ACCESSIBLE) return "accessible";
        return normalizeSpotStatus(spot.getStatus());
    }

    private boolean isCandidateForSensorProjection(String status) {
        if (!StringUtils.hasText(status)) {
            return true;
        }
        return !STATUS_RESERVED.equalsIgnoreCase(status) && !STATUS_OCCUPIED.equalsIgnoreCase(status);
    }

    private List<ParkingLotDetailsResponse.EVChargerResponse> fetchEVChargers(UUID lotId) {
        return evChargerRepository.findByParkingLotId(lotId).stream()
            .map(c -> new ParkingLotDetailsResponse.EVChargerResponse(
                c.getType(), c.getSpeed(), parseSpeedKw(c.getSpeed()), c.getPricePerKwh(), c.isAvailable()))
            .toList();
    }

    private List<ParkingLotDetailsResponse.AccessibilityResponse> fetchAccessibility(UUID lotId) {
        return accessibleSpotRepository.findByParkingLotId(lotId).stream()
            .map(a -> new ParkingLotDetailsResponse.AccessibilityResponse(
                a.getLocation(), a.isAvailable(), a.getDistanceToEntranceMeters(), a.getBaySize(),
                a.isMonitored(), a.isHasRampSpace(),
                a.getSensorStatus(),
                a.getLedStatus()))
            .toList();
    }

    private int parseSpeedKw(String speed) {
        if (speed == null) return 0;
        Matcher m = SPEED_KW_PATTERN.matcher(speed);
        return m.find() ? Integer.parseInt(m.group(1)) : 0;
    }

    private List<ParkingLotDetailsResponse.TariffResponse> fetchTariffs(UUID lotId) {
        return tariffRepository.findByParkingLotId(lotId).stream()
            .map(t -> new ParkingLotDetailsResponse.TariffResponse(
                t.getName(), t.getDescription(), t.getPricePerHour(), t.getMaxDaily(), t.getMonthly(), t.getPricePerKwh()))
            .toList();
    }

    public List<Map<String, Object>> getHourlyOccupancy(UUID id) {
        if (!parkingLotRepository.existsById(id)) {
            throw new pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException(LOT_NOT_FOUND_MSG + id);
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
