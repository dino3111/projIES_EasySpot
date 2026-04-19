package pt.ua.deti.apieasyspot.occupancy.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;
import pt.ua.deti.apieasyspot.occupancy.dto.ParkingLotDetailsResponse;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.repository.*;

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
