package pt.ua.deti.apieasyspot.occupancy.service;

import java.time.Duration;
import java.time.Instant;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingSpot;
import pt.ua.deti.apieasyspot.occupancy.model.ZoneType;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingSpotRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.TimescaleOccupancySnapshotRepository;

@Service
@RequiredArgsConstructor
public class OccupancySnapshotIngestService {

    private final ParkingSpotRepository parkingSpotRepository;
    private final TimescaleOccupancySnapshotRepository timescaleOccupancySnapshotRepository;

    @Value("${easyspot.occupancy.snapshot-min-interval-seconds:5}")
    private int snapshotMinIntervalSeconds;

    public void captureLotSnapshotIfDue(UUID parkingLotId) {
        Instant now = Instant.now();
        Instant last = timescaleOccupancySnapshotRepository.latestRecordedAt(parkingLotId);
        if (last != null && Duration.between(last, now).getSeconds() < snapshotMinIntervalSeconds) {
            return;
        }

        List<ParkingSpot> spots = parkingSpotRepository.findByParkingLotId(parkingLotId);
        if (spots.isEmpty()) return;

        Map<ZoneType, ZoneCounters> countersByZone = new EnumMap<>(ZoneType.class);
        for (ParkingSpot spot : spots) {
            ZoneType zone = spot.getZone();
            ZoneCounters counters = countersByZone.computeIfAbsent(zone, ignored -> new ZoneCounters());
            counters.total++;
            if (countsAsOccupied(spot.getStatus())) {
                counters.occupied++;
            }
        }

        Instant recordedAt = Instant.now();
        for (Map.Entry<ZoneType, ZoneCounters> entry : countersByZone.entrySet()) {
            timescaleOccupancySnapshotRepository.insert(
                UUID.randomUUID(),
                parkingLotId,
                entry.getKey(),
                entry.getValue().occupied,
                entry.getValue().total,
                recordedAt
            );
        }
    }

    private boolean countsAsOccupied(String status) {
        if (status == null) return false;
        String normalized = status.trim().toLowerCase();
        return !("free".equals(normalized) || "ev".equals(normalized) || "accessible".equals(normalized));
    }

    private static final class ZoneCounters {
        int occupied;
        int total;
    }
}
