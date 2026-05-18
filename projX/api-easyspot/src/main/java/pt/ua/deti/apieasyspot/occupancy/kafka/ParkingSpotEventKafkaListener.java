package pt.ua.deti.apieasyspot.occupancy.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import pt.ua.deti.apieasyspot.occupancy.dto.ParkingSpotEvent;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingSpot;
import pt.ua.deti.apieasyspot.occupancy.model.ZoneType;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingSpotRepository;
import pt.ua.deti.apieasyspot.occupancy.service.OccupancySnapshotIngestService;

import java.util.Locale;

@Slf4j
@Component
@RequiredArgsConstructor
public class ParkingSpotEventKafkaListener {

    private static final String STATUS_FREE = "free";
    private static final String STATUS_OCCUPIED = "occupied";
    private static final String STATUS_RESERVED = "reserved";
    private static final String STATUS_OUT_OF_SERVICE = "out_of_service";


    private final ObjectMapper objectMapper;
    private final ParkingSpotRepository parkingSpotRepository;
    private final OccupancySnapshotIngestService occupancySnapshotIngestService;

    @KafkaListener(
        topics = {"parking-spot-events"},
        groupId = "${easyspot.occupancy.kafka.group-id:easyspot-occupancy}"
    )
    @Transactional
    public void onEvent(String payload){
        try {
            ParkingSpotEvent event = objectMapper.readValue(payload, ParkingSpotEvent.class);

            if (event.spotId() == null || event.status() == null) {
                return;
            }

            String normalized = normalize(event.status());

            if (!isAllowedStatus(normalized)) {
                log.warn("Ignoring invalid spot status event: {}", payload);
                return;
            }

            ParkingSpot spot = parkingSpotRepository.findById(event.spotId()).orElse(null);
            if (spot == null) {
                log.warn("Ignoring event for unknown spotId={}", event.spotId());
                return;
            }

            String current = normalize(spot.getStatus());
            if (current.equals(normalized)) {
                return;
            }
            if (!isPlausibleTransition(current, normalized)) {
                log.warn("Ignoring implausible transition for spot {}: {} -> {}",
                    spot.getId(), current, normalized);
                return;
            }

            spot.setStatus(toPersistedStatus(spot, normalized));
            parkingSpotRepository.save(spot);
            occupancySnapshotIngestService.captureLotSnapshotIfDue(spot.getParkingLot().getId());

            log.info("Updated spot {} in park {} from {} to {}",
                spot.getSpotNumber(),
                spot.getParkingLot().getId(),
                current,
                normalized
            );
        } catch (Exception ex) {
            log.warn("Invalid parking spot event ignored: {}", payload, ex);
        }
    }

    private boolean isAllowedStatus(String status) {
        return STATUS_FREE.equals(status)
            || STATUS_OCCUPIED.equals(status)
            || STATUS_RESERVED.equals(status)
            || STATUS_OUT_OF_SERVICE.equals(status);
    }

    public String normalize(String status) {
        return status.trim().toLowerCase(Locale.ROOT);
    }

    private String toPersistedStatus(ParkingSpot spot, String status) {
        if(STATUS_FREE.equals(status)) {
            if(spot.getZone() == ZoneType.ACCESSIBLE) {
                return "accessible";
            }
            if (spot.getZone() == ZoneType.EV) {
                return "ev";
            }

            return STATUS_FREE;
        }
        return status;
    }

    private boolean isPlausibleTransition(String from, String to) {
        if (from.equals(to)) return true;
        if (STATUS_FREE.equals(from)) {
            return STATUS_OCCUPIED.equals(to) || STATUS_RESERVED.equals(to) || STATUS_OUT_OF_SERVICE.equals(to);
        }
        if (STATUS_OCCUPIED.equals(from)) {
            return STATUS_FREE.equals(to) || STATUS_OUT_OF_SERVICE.equals(to);
        }
        if (STATUS_RESERVED.equals(from)) {
            return STATUS_OCCUPIED.equals(to) || STATUS_FREE.equals(to) || STATUS_OUT_OF_SERVICE.equals(to);
        }
        if (STATUS_OUT_OF_SERVICE.equals(from)) {
            return STATUS_FREE.equals(to) || STATUS_OUT_OF_SERVICE.equals(to);
        }
        return STATUS_FREE.equals(to);
    }

}
