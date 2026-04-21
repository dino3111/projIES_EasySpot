package pt.ua.deti.apieasyspot.billing.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
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
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ParkingPlanningService {

    private final JdbcTemplate jdbc;

    private static final ZoneId LISBON = ZoneId.of("Europe/Lisbon");

    public ParkingPlanningResponse plan(ParkingPlanningRequest req) {
        List<LotCandidate> candidates = fetchCandidates(req);
        candidates = candidates.stream()
            .filter(c -> c.distanceMeters <= req.maxDistanceMeters())
            .filter(c -> isOpen(c.openingHours))
            .filter(c -> !needsEv(req) || c.hasEv)
            .filter(c -> !needsAccessible(req) || c.hasAccessible)
            .filter(c -> c.currentOccupancyPct < 100)
            .toList();

        Comparator<LotCandidate> comparator = switch (req.effectiveOrderBy()) {
            case lowestPrice -> Comparator.comparing(c -> c.pricePerHour != null ? c.pricePerHour : BigDecimal.valueOf(Double.MAX_VALUE));
            case nearest -> Comparator.comparingDouble(c -> c.distanceMeters);
            case best -> Comparator.comparingDouble(this::score).reversed();
        };

        List<ParkingPlanningResponse.ParkingSummary> summaries = candidates.stream()
            .sorted(comparator)
            .map(c -> toSummary(c, req.estimatedDurationMinutes()))
            .toList();

        return new ParkingPlanningResponse(summaries);
    }

    private List<LotCandidate> fetchCandidates(ParkingPlanningRequest req) {
        boolean needEv = needsEv(req);
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
            """ +
            (needEv  ? " AND COALESCE(pa.ev_total, 0) > 0"  : "") +
            (needAcc ? " AND COALESCE(pa.acc_total, 0) > 0" : "") +
            """
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
        String cityLike = "%" + req.city() + "%";

        return jdbc.query(sql,
            (rs, rowNum) -> mapCandidate(rs),
            lat, lng, lat, cityLike,
            lat, lng, lat, req.maxDistanceMeters()
        );
    }

    private LotCandidate mapCandidate(ResultSet rs) throws SQLException {
        UUID id = UUID.fromString(rs.getString("id"));
        String name = rs.getString("name");
        String address = rs.getString("address");
        String openingHours = rs.getString("opening_hours");
        double distanceMeters = rs.getDouble("distance_meters");
        BigDecimal pricePerHour = rs.getBigDecimal("price_per_hour");
        int occTotal = rs.getInt("occ_total");
        int capTotal = rs.getInt("cap_total");
        int evTotal = rs.getInt("ev_total");
        int accTotal = rs.getInt("acc_total");
        int pct = capTotal > 0 ? (int) Math.round((double) occTotal / capTotal * 100) : 0;

        List<ParkingPlanningResponse.HourlyOccupancy> hourly = fetchHourlyOccupancy(id);

        return new LotCandidate(id, name, address, openingHours, distanceMeters,
            pricePerHour, occTotal, capTotal, pct, evTotal > 0, accTotal > 0, hourly);
    }

    private List<ParkingPlanningResponse.HourlyOccupancy> fetchHourlyOccupancy(UUID lotId) {
        return jdbc.query(
            """
            SELECT EXTRACT(HOUR FROM recorded_at AT TIME ZONE 'Europe/Lisbon') AS hour_of_day,
                   ROUND(AVG(CASE WHEN total_count > 0
                       THEN occupied_count::numeric / total_count * 100 ELSE 0 END)) AS occ_pct
            FROM occupancy_snapshots
            WHERE parking_lot_id = ?
              AND recorded_at >= NOW() - INTERVAL '7 days'
            GROUP BY hour_of_day
            ORDER BY hour_of_day
            """,
            (rs, rowNum) -> new ParkingPlanningResponse.HourlyOccupancy(
                String.format("%02dh", rs.getInt("hour_of_day")),
                rs.getInt("occ_pct")
            ),
            lotId
        );
    }

    private ParkingPlanningResponse.ParkingSummary toSummary(LotCandidate c, int durationMinutes) {
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
    double score(LotCandidate c) {
        double availScore = 1.0 - (c.currentOccupancyPct / 100.0);

        double priceScore;
        if (c.pricePerHour == null || c.pricePerHour.compareTo(BigDecimal.ZERO) == 0) {
            priceScore = 1.0;
        } else {
            // Normalize: assume max meaningful price is 5.0 EUR/h
            priceScore = Math.max(0, 1.0 - c.pricePerHour.doubleValue() / 5.0);
        }

        // Normalize distance: assume max is maxDistanceMeters, but we use 5000m as reference
        double distScore = Math.max(0, 1.0 - c.distanceMeters / 5000.0);

        return 0.5 * availScore + 0.3 * priceScore + 0.2 * distScore;
    }

    boolean isOpen(String openingHours) {
        if (openingHours == null || openingHours.isBlank()) return true;
        String h = openingHours.trim().toLowerCase();
        if (h.equals("24h") || h.equals("24/7")) return true;

        // Parse patterns like "08:00-22:00" or "08h-22h"
        String normalized = h.replace("h", ":00").replaceAll("\\s", "");
        String[] parts = normalized.split("-");
        if (parts.length != 2) return true;

        try {
            int nowMinutes = nowMinutesOfDay();
            int openMinutes = parseTimeToMinutes(parts[0]);
            int closeMinutes = parseTimeToMinutes(parts[1]);
            if (closeMinutes <= openMinutes) return true; // overnight schedule, treat as open
            return nowMinutes >= openMinutes && nowMinutes < closeMinutes;
        } catch (Exception e) {
            return true; // unparseable → assume open
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
