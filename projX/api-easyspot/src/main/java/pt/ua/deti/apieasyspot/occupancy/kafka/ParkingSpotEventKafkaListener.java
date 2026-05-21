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
import pt.ua.deti.apieasyspot.occupancy.service.SpotStateResolver;
import pt.ua.deti.apieasyspot.sensor.service.SensorLogsService;

import java.time.Instant;
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
    private final SpotStateResolver spotStateResolver;

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

            ParkingSpot spot = parkingSpotRepository.findById(event.spotId()).orElse(null);
            if (spot == null) {
                log.warn("Ignoring event for unknown spotId={}", event.spotId());
                return;
            }

            String current = spotStateResolver.normalize(spot.getStatus());
            SpotStateResolver.Resolution resolution =
                spotStateResolver.resolve(current, event.status(), event.payload());
            if (!resolution.accepted()) {
                log.warn("Ignoring spot event for spotId={} reason={}", event.spotId(), resolution.reasonCode());
                return;
            }
            String resolved = resolution.finalStatus();
            if (current.equals(resolved)) {
                return;
            }

            String persisted = toPersistedStatus(spot, resolved);
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

            if (STATUS_OUT_OF_SERVICE.equals(resolved)) {
                sensorLogsService.faultSensor(sensorId);
            }

            if (isRecoveryTransition(current, resolved)) {
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

}
