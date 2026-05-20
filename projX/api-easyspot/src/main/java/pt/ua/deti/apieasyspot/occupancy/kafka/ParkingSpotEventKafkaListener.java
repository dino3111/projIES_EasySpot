package pt.ua.deti.apieasyspot.occupancy.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import pt.ua.deti.apieasyspot.occupancy.dto.ParkingSpotEvent;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingSpot;
import pt.ua.deti.apieasyspot.occupancy.model.ZoneType;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingSpotRepository;
import pt.ua.deti.apieasyspot.occupancy.service.OccupancySnapshotIngestService;
import pt.ua.deti.apieasyspot.sensor.service.SensorLogsService;

import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

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
    private final OccupancyEventPublisher occupancyEventPublisher;
    private final SensorLogsService sensorLogsService;

    @KafkaListener(
        topics = {"${easyspot.occupancy.kafka.input-topic:parking-spot-events}"},
        groupId = "${easyspot.occupancy.kafka.group-id:easyspot-occupancy}"
    )
    @Transactional
    public void onEvent(String payload) {
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

            String persisted = toPersistedStatus(spot, normalized);
            spot.setStatus(persisted);
            parkingSpotRepository.save(spot);
            occupancySnapshotIngestService.captureLotSnapshotIfDue(spot.getParkingLot().getId());

            log.info("Updated spot {} in park {} from {} to {}",
                spot.getSpotNumber(),
                spot.getParkingLot().getId(),
                current,
                persisted
            );

            OccupancyEvent occupancyEvent = new OccupancyEvent(
                UUID.randomUUID(),
                "occupancy.spot.changed",
                spot.getParkingLot().getId(),
                spot.getId(),
                current,
                persisted,
                Instant.now(),
                spot.getZone().name(),
                spot.getSpotNumber(),
                1
            );
            if (TransactionSynchronizationManager.isSynchronizationActive()) {
                TransactionSynchronizationManager.registerSynchronization(
                    new TransactionSynchronization() {
                        @Override
                        public void afterCommit() {
                            occupancyEventPublisher.publish(occupancyEvent);
                        }
                    }
                );
            } else {
                occupancyEventPublisher.publish(occupancyEvent);
            }

            String sensorId = sensorIdFromSpotId(event.spotId());
            sensorLogsService.touchSensor(sensorId);

            if (STATUS_OUT_OF_SERVICE.equals(normalized)) {
                sensorLogsService.faultSensor(sensorId);
            }

            if (isRecoveryTransition(current, normalized)) {
                String reason = extractReason(event);
                if ("AUTO_RECOVERY".equals(reason) || "TECHNICIAN_REPAIR".equals(reason)) {
                    sensorLogsService.recoverSensor(sensorId, reason);
                }
            }
        } catch (Exception ex) {
            log.warn("Invalid parking spot event ignored: {}", payload, ex);
        }
    }

    private boolean isRecoveryTransition(String previousNormalized, String newNormalized) {
        return STATUS_OUT_OF_SERVICE.equals(previousNormalized) && STATUS_FREE.equals(newNormalized);
    }

    private String extractReason(ParkingSpotEvent event) {
        if (event.payload() == null) return null;
        Object reason = event.payload().get("reason");
        return reason instanceof String s ? s : null;
    }

    private String sensorIdFromSpotId(UUID spotId) {
        return "IR-" + spotId.toString().replace("-", "").substring(0, 16);
    }

    private boolean isAllowedStatus(String status) {
        return STATUS_FREE.equals(status)
            || STATUS_OCCUPIED.equals(status)
            || STATUS_RESERVED.equals(status)
            || STATUS_OUT_OF_SERVICE.equals(status);
    }

    public String normalize(String status) {
        String s = status.trim().toLowerCase(Locale.ROOT);
        // "accessible" and "ev" are persisted forms of "free" for typed zones;
        // treat them as free so transition logic stays consistent.
        if ("accessible".equals(s) || "ev".equals(s)) {
            return STATUS_FREE;
        }
        return s;
    }

    private String toPersistedStatus(ParkingSpot spot, String status) {
        if (STATUS_FREE.equals(status)) {
            if (spot.getZone() == ZoneType.ACCESSIBLE) {
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
