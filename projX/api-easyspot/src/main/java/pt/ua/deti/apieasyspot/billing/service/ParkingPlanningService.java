package pt.ua.deti.apieasyspot.billing.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import pt.ua.deti.apieasyspot.billing.dto.ParkingPlanningRequest;
import pt.ua.deti.apieasyspot.billing.dto.ParkingPlanningResponse;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.model.Tariff;
import pt.ua.deti.apieasyspot.occupancy.model.ZoneType;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.TariffRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.TimescaleOccupancySnapshotRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.TimescaleOccupancySnapshotRepository.HourlyOccupancyPoint;
import pt.ua.deti.apieasyspot.occupancy.repository.TimescaleOccupancySnapshotRepository.ZoneSnapshot;

@Slf4j
@Service
@RequiredArgsConstructor
public class ParkingPlanningService {

    private static final ZoneId LISBON = ZoneId.of("Europe/Lisbon");
    private static final double MAX_PRICE_REFERENCE_EUR = 5.0;

    private final ParkingLotRepository parkingLotRepository;
    private final TariffRepository tariffRepository;
    private final TimescaleOccupancySnapshotRepository occupancyRepository;

    public ParkingPlanningResponse plan(ParkingPlanningRequest req) {
        List<ParkingLot> lots = parkingLotRepository.findAll().stream()
            .filter(lot -> lot.getCity() != null && lot.getCity().toLowerCase().startsWith(req.city().toLowerCase()))
            .toList();

        Map<UUID, List<ZoneSnapshot>> snapshotsByLot = occupancyRepository.latestByLotIds(
            lots.stream().map(ParkingLot::getId).toList()
        );
        Map<UUID, List<HourlyOccupancyPoint>> hourlyByLot = occupancyRepository.hourlyOccupancyLast7Days(
            lots.stream().map(ParkingLot::getId).toList()
        );

        List<LotCandidate> candidates = lots.stream()
            .map(lot -> toCandidate(lot, snapshotsByLot.getOrDefault(lot.getId(), List.of()), hourlyByLot.getOrDefault(lot.getId(), List.of()), req))
            .filter(c -> c.distanceMeters <= req.maxDistanceMeters())
            .filter(c -> isOpen(c.openingHours, c.id))
            .filter(c -> !needsEv(req) || c.hasEv)
            .filter(c -> !needsAccessible(req) || c.hasAccessible)
            .filter(c -> c.currentOccupancyPct < 100)
            .toList();

        double maxDist = req.maxDistanceMeters();
        Comparator<LotCandidate> comparator = switch (req.effectiveOrderBy()) {
            case LOWEST_PRICE -> Comparator.comparing(c -> c.pricePerHour != null ? c.pricePerHour : BigDecimal.valueOf(Double.MAX_VALUE));
            case NEAREST -> Comparator.comparingDouble(c -> c.distanceMeters);
            case BEST -> Comparator.comparingDouble((LotCandidate c) -> score(c, maxDist)).reversed();
        };

        List<ParkingPlanningResponse.ParkingSummary> summaries = candidates.stream()
            .sorted(comparator)
            .map(this::toSummary)
            .toList();

        return new ParkingPlanningResponse(summaries);
    }

    private LotCandidate toCandidate(
        ParkingLot lot,
        List<ZoneSnapshot> snapshots,
        List<HourlyOccupancyPoint> hourlyPoints,
        ParkingPlanningRequest req
    ) {
        int occTotal = snapshots.stream().mapToInt(ZoneSnapshot::occupiedCount).sum();
        int capTotal = snapshots.isEmpty() ? lot.getTotalSpaces() : snapshots.stream().mapToInt(ZoneSnapshot::totalCount).sum();
        int pct = capTotal > 0 ? (int) Math.round((double) occTotal / capTotal * 100) : 0;
        boolean hasEv = snapshots.stream().anyMatch(s -> s.zoneType() == ZoneType.EV && s.totalCount() > 0);
        boolean hasAccessible = snapshots.stream().anyMatch(s -> s.zoneType() == ZoneType.ACCESSIBLE && s.totalCount() > 0);

        return new LotCandidate(
            lot.getId(),
            lot.getName(),
            lot.getAddress(),
            lot.getOpeningHours(),
            distanceMeters(req.location().lat(), req.location().lng(), lot.getLatitude(), lot.getLongitude()),
            minPrice(lot.getId()),
            occTotal,
            capTotal,
            pct,
            hasEv,
            hasAccessible,
            hourlyPoints.stream()
                .sorted(Comparator.comparingInt(HourlyOccupancyPoint::hourOfDay))
                .map(point -> new ParkingPlanningResponse.HourlyOccupancy(String.format("%02dh", point.hourOfDay()), point.occupancyPercent()))
                .toList()
        );
    }

    private BigDecimal minPrice(UUID lotId) {
        return tariffRepository.findByParkingLotId(lotId).stream()
            .map(Tariff::getPricePerHour)
            .filter(Objects::nonNull)
            .min(BigDecimal::compareTo)
            .orElse(null);
    }

    private double distanceMeters(double lat1, double lng1, double lat2, double lng2) {
        double earthRadius = 6371000.0;
        double deltaLat = Math.toRadians(lat2 - lat1);
        double deltaLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2)
            + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
            * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadius * c;
    }

    private ParkingPlanningResponse.ParkingSummary toSummary(LotCandidate c) {
        String status = classifyStatus(c.currentOccupancyPct);
        return new ParkingPlanningResponse.ParkingSummary(
            c.id,
            c.name,
            c.openingHours,
            Math.round(c.distanceMeters * 10.0) / 10.0,
            c.address,
            c.pricePerHour,
            new ParkingPlanningResponse.OccupancyInfo(c.occTotal, c.capTotal, c.currentOccupancyPct, status),
            c.hourlyOccupancy
        );
    }

    double score(LotCandidate c, double maxDistanceMeters) {
        double availScore = 1.0 - (c.currentOccupancyPct / 100.0);

        double priceScore;
        if (c.pricePerHour == null || c.pricePerHour.compareTo(BigDecimal.ZERO) == 0) {
            priceScore = 1.0;
        } else {
            priceScore = Math.max(0, 1.0 - c.pricePerHour.doubleValue() / MAX_PRICE_REFERENCE_EUR);
        }

        double distScore = maxDistanceMeters > 0
            ? Math.max(0, 1.0 - c.distanceMeters / maxDistanceMeters)
            : 0.0;

        return 0.5 * availScore + 0.3 * priceScore + 0.2 * distScore;
    }

    boolean isOpen(String openingHours, UUID lotId) {
        if (openingHours == null || openingHours.isBlank()) return true;
        String h = openingHours.trim().toLowerCase();
        if (h.equals("24h") || h.equals("24/7")) return true;

        String normalized = h.replace("h", ":00").replaceAll("\\s", "");
        String[] parts = normalized.split("-");
        if (parts.length != 2) {
            log.warn("Unparseable opening_hours '{}' for lot {} — assuming open", openingHours, lotId);
            return true;
        }

        try {
            int nowMinutes = nowMinutesOfDay();
            int openMinutes = parseTimeToMinutes(parts[0]);
            int closeMinutes = parseTimeToMinutes(parts[1]);

            if (closeMinutes <= openMinutes) {
                return nowMinutes >= openMinutes || nowMinutes < closeMinutes;
            }
            return nowMinutes >= openMinutes && nowMinutes < closeMinutes;
        } catch (Exception exception) {
            log.warn("Failed to parse opening_hours '{}' for lot {}: {}", openingHours, lotId, exception.getMessage());
            return true;
        }
    }

    int nowMinutesOfDay() {
        var now = Instant.now().atZone(LISBON).toLocalTime();
        return now.getHour() * 60 + now.getMinute();
    }

    private int parseTimeToMinutes(String time) {
        String[] hm = time.split(":");
        return Integer.parseInt(hm[0]) * 60 + (hm.length > 1 ? Integer.parseInt(hm[1]) : 0);
    }

    private boolean needsEv(ParkingPlanningRequest req) {
        return Boolean.TRUE.equals(req.isElectric());
    }

    private boolean needsAccessible(ParkingPlanningRequest req) {
        return Boolean.TRUE.equals(req.isAccessible());
    }

    private String classifyStatus(int pct) {
        if (pct >= 100) return "FULL";
        if (pct >= 90) return "LIMITED";
        return "AVAILABLE";
    }

    record LotCandidate(
        UUID id,
        String name,
        String address,
        String openingHours,
        double distanceMeters,
        BigDecimal pricePerHour,
        int occTotal,
        int capTotal,
        int currentOccupancyPct,
        boolean hasEv,
        boolean hasAccessible,
        List<ParkingPlanningResponse.HourlyOccupancy> hourlyOccupancy
    ) {}
}
