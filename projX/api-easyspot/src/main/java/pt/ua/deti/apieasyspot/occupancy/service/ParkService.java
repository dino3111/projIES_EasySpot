package pt.ua.deti.apieasyspot.occupancy.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;
import pt.ua.deti.apieasyspot.occupancy.dto.ParkingLotDetailsResponse;
import pt.ua.deti.apieasyspot.occupancy.dto.ParkingLotSummaryResponse;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.repository.*;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ParkService {

    private final ParkingLotRepository parkingLotRepository;
    private final TariffRepository tariffRepository;
    private final EVChargerRepository evChargerRepository;
    private final AccessibleSpotRepository accessibleSpotRepository;
    private final ParkingSpotRepository parkingSpotRepository;
    private final JdbcTemplate jdbc;

    public ParkingLotSummaryResponse searchParks(String textQuery, Integer minAvailableSpaces, List<String> filters, int page, int pageSize) {
        boolean filterEV = filters != null && filters.contains("EV");
        boolean filterAcc = filters != null && filters.contains("ACCESSIBLE");
        int offset = (page - 1) * pageSize;

        StringBuilder sql = buildBaseSql();
        List<Object> params = new ArrayList<>();
        appendFilters(sql, params, textQuery, minAvailableSpaces, filterEV, filterAcc);
        sql.append(" GROUP BY p.id, pa.total_spaces, pa.free_spaces, pa.ev_free, pa.ev_total, pa.acc_free, pa.acc_total");
        sql.append(" ORDER BY p.name ASC LIMIT ? OFFSET ?");
        params.add(pageSize);
        params.add(offset);

        long[] totalItems = {0};
        List<ParkingLotSummaryResponse.ParkingLotSummary> items = jdbc.query(
            sql.toString(),
            (rs, rowNum) -> mapRow(rs, totalItems),
            params.toArray()
        );

        int totalPages = totalItems[0] == 0 ? 0 : (int) Math.ceil((double) totalItems[0] / pageSize);
        return new ParkingLotSummaryResponse(
            items,
            new ParkingLotSummaryResponse.PaginationInfo(page, pageSize, totalItems[0], totalPages)
        );
    }

    private StringBuilder buildBaseSql() {
        return new StringBuilder("""
            WITH latest_snapshots AS (
                SELECT parking_lot_id, zone_type, occupied_count, total_count,
                    ROW_NUMBER() OVER (PARTITION BY parking_lot_id, zone_type ORDER BY recorded_at DESC) as rn
                FROM occupancy_snapshots
            ),
            latest_only AS (SELECT * FROM latest_snapshots WHERE rn = 1),
            park_availability AS (
                SELECT parking_lot_id,
                    SUM(total_count) as total_spaces,
                    SUM(total_count - occupied_count) as free_spaces,
                    SUM(CASE WHEN zone_type = 'EV' THEN total_count ELSE 0 END) as ev_total,
                    SUM(CASE WHEN zone_type = 'EV' THEN total_count - occupied_count ELSE 0 END) as ev_free,
                    SUM(CASE WHEN zone_type = 'ACCESSIBLE' THEN total_count ELSE 0 END) as acc_total,
                    SUM(CASE WHEN zone_type = 'ACCESSIBLE' THEN total_count - occupied_count ELSE 0 END) as acc_free
                FROM latest_only GROUP BY parking_lot_id
            )
            SELECT p.id, p.name, p.address, MIN(t.price_per_hour) as price,
                   COALESCE(pa.total_spaces, p.total_spaces) as total_spaces,
                   COALESCE(pa.free_spaces, p.total_spaces) as free_spaces,
                   COALESCE(pa.ev_free, 0) as ev_free, COALESCE(pa.ev_total, 0) as ev_total,
                   COALESCE(pa.acc_free, 0) as acc_free, COALESCE(pa.acc_total, 0) as acc_total,
                   COUNT(*) OVER() as full_count
            FROM parking_lots p
            LEFT JOIN park_availability pa ON p.id = pa.parking_lot_id
            LEFT JOIN tariffs t ON p.id = t.parking_lot_id
            WHERE 1=1
            """);
    }

    private void appendFilters(StringBuilder sql, List<Object> params, String textQuery, Integer minAvailableSpaces, boolean filterEV, boolean filterAcc) {
        if (textQuery != null && !textQuery.isBlank()) {
            sql.append(" AND (p.name ILIKE ? OR p.city ILIKE ? OR p.address ILIKE ?)");
            String q = "%" + textQuery + "%";
            params.add(q);
            params.add(q);
            params.add(q);
        }
        if (minAvailableSpaces != null) {
            sql.append(" AND COALESCE(pa.free_spaces, p.total_spaces) >= ?");
            params.add(minAvailableSpaces);
        }
        if (filterEV) sql.append(" AND COALESCE(pa.ev_total, 0) > 0");
        if (filterAcc) sql.append(" AND COALESCE(pa.acc_total, 0) > 0");
    }

    private ParkingLotSummaryResponse.ParkingLotSummary mapRow(ResultSet rs, long[] totalItems) throws SQLException {
        totalItems[0] = rs.getLong("full_count");
        int free = rs.getInt("free_spaces");
        int total = rs.getInt("total_spaces");
        return new ParkingLotSummaryResponse.ParkingLotSummary(
            UUID.fromString(rs.getString("id")),
            rs.getString("name"),
            rs.getString("address"),
            rs.getBigDecimal("price"),
            total,
            free,
            new ParkingLotSummaryResponse.CountInfo(rs.getInt("ev_free"), rs.getInt("ev_total")),
            new ParkingLotSummaryResponse.CountInfo(rs.getInt("acc_free"), rs.getInt("acc_total")),
            classifyAvailability(free, total)
        );
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
        return jdbc.query(
            """
            select zone_type, occupied_count, total_count
            from (
                select zone_type, occupied_count, total_count,
                       row_number() over (
                           partition by zone_type
                           order by recorded_at desc
                       ) as rn
                from occupancy_snapshots
                where parking_lot_id = ?
            ) latest
            where rn = 1
            """,
            (rs, rowNum) -> {
                int occupied = rs.getInt("occupied_count");
                int total = rs.getInt("total_count");
                int free = Math.max(0, total - occupied);
                int pct = total > 0 ? (int) Math.round((double) occupied / total * 100) : 0;
                return new ParkingLotDetailsResponse.ZoneResponse(rs.getString("zone_type"), total, free, pct);
            },
            lotId
        );
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
}
