package pt.ua.deti.apieasyspot.billing.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import pt.ua.deti.apieasyspot.billing.dto.ParkingPlanningRequest;
import pt.ua.deti.apieasyspot.billing.dto.ParkingPlanningResponse;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ParkingPlanningService {

    private final JdbcTemplate jdbc;
    private final NamedParameterJdbcTemplate namedJdbc;

    private static final ZoneId LISBON = ZoneId.of("Europe/Lisbon");
    private static final double MAX_PRICE_REFERENCE_EUR = 5.0;

    public ParkingPlanningResponse plan(ParkingPlanningRequest req) {
        List<LotCandidate> candidates = fetchCandidates(req);
        candidates = candidates.stream()
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

    private List<LotCandidate> fetchCandidates(ParkingPlanningRequest req) {
        boolean needEv  = needsEv(req);
        boolean needAcc = needsAccessible(req);

        String sql = """
            WITH latest_snapshots AS (
                SELECT parking_lot_id, zone_type, occupied_count, total_count,
                       ROW_NUMBER() OVER (PARTITION BY parking_lot_id, zone_type ORDER BY recorded_at DESC) AS rn
                FROM occupancy_snapshots
            ),
            latest_only AS (SELECT * FROM latest_snapshots WHERE rn = 1),
            park_agg AS (
                SELECT parking_lot_id,
                       SUM(occupied_count) AS occ_total,
                       SUM(total_count) AS cap_total,
                       SUM(CASE WHEN zone_type = 'EV' THEN total_count ELSE 0 END) AS ev_total,
                       SUM(CASE WHEN zone_type = 'ACCESSIBLE' THEN total_count ELSE 0 END) AS acc_total
                FROM latest_only
                GROUP BY parking_lot_id
            )
            SELECT p.id, p.name, p.address, p.opening_hours, p.latitude, p.longitude,
                   MIN(t.price_per_hour) AS price_per_hour,
                   COALESCE(pa.occ_total, 0) AS occ_total,
                   COALESCE(pa.cap_total, p.total_spaces) AS cap_total,
                   COALESCE(pa.ev_total, 0) AS ev_total,
                   COALESCE(pa.acc_total, 0) AS acc_total,
                   (6371000 * acos(
                       LEAST(1.0, cos(radians(?)) * cos(radians(p.latitude))
                           * cos(radians(p.longitude) - radians(?))
                           + sin(radians(?)) * sin(radians(p.latitude))
                   )) AS distance_meters
            FROM parking_lots p
            LEFT JOIN park_agg pa ON p.id = pa.parking_lot_id
            LEFT JOIN tariffs t ON p.id = t.parking_lot_id AND t.status = 'ACTIVE'
            WHERE p.city ILIKE ?
              AND (? OR COALESCE(pa.ev_total, 0) > 0)
              AND (? OR COALESCE(pa.acc_total, 0) > 0)
            GROUP BY p.id, p.name, p.address, p.opening_hours, p.latitude, p.longitude,
                     pa.occ_total, pa.cap_total, pa.ev_total, pa.acc_total
            HAVING (6371000 * acos(
                       LEAST(1.0, cos(radians(?)) * cos(radians(p.latitude))
                           * cos(radians(p.longitude) - radians(?))
                           + sin(radians(?)) * sin(radians(p.latitude))
                   )) <= ?
            ORDER BY distance_meters ASC
            """;

        double lat = req.location().lat();
        double lng = req.location().lng();
        String cityPrefix = req.city() + "%";

        List<LotCandidate> candidates = jdbc.query(sql,
            (rs, rowNum) -> mapCandidateWithoutHourly(rs),
            lat, lng, lat, cityPrefix, !needEv, !needAcc,
            lat, lng, lat, req.maxDistanceMeters()
        );

        if (candidates.isEmpty()) return candidates;

        List<UUID> ids = candidates.stream().map(c -> c.id).toList();
        Map<UUID, List<ParkingPlanningResponse.HourlyOccupancy>> hourlyByLot = fetchAllHourlyOccupancy(ids);

        return candidates.stream()
            .map(c -> new LotCandidate(c.id, c.name, c.address, c.openingHours, c.distanceMeters,
                c.pricePerHour, c.occTotal, c.capTotal, c.currentOccupancyPct, c.hasEv, c.hasAccessible,
                hourlyByLot.getOrDefault(c.id, List.of())))
            .toList();
    }

    private LotCandidate mapCandidateWithoutHourly(ResultSet rs) throws SQLException {
        UUID id = UUID.fromString(rs.getString("id"));
        int occTotal = rs.getInt("occ_total");
        int capTotal = rs.getInt("cap_total");
        int pct = capTotal > 0 ? (int) Math.round((double) occTotal / capTotal * 100) : 0;

        return new LotCandidate(
            id,
            rs.getString("name"),
            rs.getString("address"),
            rs.getString("opening_hours"),
            rs.getDouble("distance_meters"),
            rs.getBigDecimal("price_per_hour"),
            occTotal,
            capTotal,
            pct,
            rs.getInt("ev_total") > 0,
            rs.getInt("acc_total") > 0,
            List.of()
        );
    }

    private Map<UUID, List<ParkingPlanningResponse.HourlyOccupancy>> fetchAllHourlyOccupancy(List<UUID> lotIds) {
        String sql = """
            SELECT parking_lot_id,
                   EXTRACT(HOUR FROM recorded_at AT TIME ZONE 'Europe/Lisbon') AS hour_of_day,
                   ROUND(AVG(CASE WHEN total_count > 0
                       THEN occupied_count::numeric / total_count * 100 ELSE 0 END)) AS occ_pct
            FROM occupancy_snapshots
            WHERE parking_lot_id IN (:ids)
              AND recorded_at >= NOW() - INTERVAL '7 days'
            GROUP BY parking_lot_id, hour_of_day
            ORDER BY parking_lot_id, hour_of_day
            """;

        return namedJdbc.query(sql, Map.of("ids", lotIds), (rs, rowNum) -> {
            UUID lotId = UUID.fromString(rs.getString("parking_lot_id"));
            String hour = String.format("%02dh", rs.getInt("hour_of_day"));
            int pct = rs.getInt("occ_pct");
            return Map.entry(lotId, new ParkingPlanningResponse.HourlyOccupancy(hour, pct));
        }).stream().collect(Collectors.groupingBy(
            Map.Entry::getKey,
            Collectors.mapping(Map.Entry::getValue, Collectors.toList())
        ));
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

    // Composite score: 50% availability, 30% price (inverse), 20% distance (inverse)
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
            int nowMinutes   = nowMinutesOfDay();
            int openMinutes  = parseTimeToMinutes(parts[0]);
            int closeMinutes = parseTimeToMinutes(parts[1]);

            if (closeMinutes <= openMinutes) {
                // Overnight schedule (e.g. 22:00–06:00): open if after opening OR before closing
                return nowMinutes >= openMinutes || nowMinutes < closeMinutes;
            }
            return nowMinutes >= openMinutes && nowMinutes < closeMinutes;
        } catch (Exception e) {
            log.warn("Failed to parse opening_hours '{}' for lot {}: {}", openingHours, lotId, e.getMessage());
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
