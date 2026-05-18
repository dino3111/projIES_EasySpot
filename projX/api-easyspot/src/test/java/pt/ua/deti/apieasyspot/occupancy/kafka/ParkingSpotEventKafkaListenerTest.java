package pt.ua.deti.apieasyspot.occupancy.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingSpot;
import pt.ua.deti.apieasyspot.occupancy.model.ZoneType;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingSpotRepository;
import pt.ua.deti.apieasyspot.sensor.service.SensorLogsService;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class ParkingSpotEventKafkaListenerTest {

    private ParkingSpotRepository parkingSpotRepository;
    private SensorLogsService sensorLogsService;
    private ParkingSpotEventKafkaListener listener;

    @BeforeEach
    void setUp() {
        parkingSpotRepository = mock(ParkingSpotRepository.class);
        sensorLogsService = mock(SensorLogsService.class);
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
        listener = new ParkingSpotEventKafkaListener(objectMapper, parkingSpotRepository, sensorLogsService);
    }

    private ParkingSpot spotWithStatus(UUID spotId, String status) {
        ParkingLot lot = new ParkingLot();
        lot.setId(UUID.randomUUID());
        lot.setName("Parque Test");

        ParkingSpot spot = new ParkingSpot();
        spot.setId(spotId);
        spot.setParkingLot(lot);
        spot.setSpotNumber("A01");
        spot.setZone(ZoneType.STANDARD);
        spot.setStatus(status);
        return spot;
    }

    @Test
    @DisplayName("AUTO_RECOVERY event updates spot status and recovers associated sensor")
    void onEvent_autoRecovery_updatesSpotAndRecoversSensor() {
        UUID spotId = UUID.randomUUID();
        ParkingSpot spot = spotWithStatus(spotId, "out_of_service");
        when(parkingSpotRepository.findById(spotId)).thenReturn(Optional.of(spot));

        String expectedSensorId = "IR-" + spotId.toString().replace("-", "").substring(0, 16);

        String payload = """
            {
              "eventId": "%s",
              "eventType": "spot.status.changed",
              "parkId": "%s",
              "spotId": "%s",
              "previousStatus": "out_of_service",
              "status": "free",
              "occurredAt": "2026-05-18T10:00:00Z",
              "version": 1,
              "payload": {
                "reason": "AUTO_RECOVERY",
                "recoveryType": "AUTO_RECOVERY",
                "faultDurationSeconds": 45.5
              }
            }
            """.formatted(UUID.randomUUID(), UUID.randomUUID(), spotId);

        listener.onEvent(payload);

        verify(parkingSpotRepository).save(spot);
        assertThat(spot.getStatus()).isEqualTo("free");
        verify(sensorLogsService).recoverSensor(expectedSensorId, "AUTO_RECOVERY");
    }

    @Test
    @DisplayName("TECHNICIAN_REPAIR event updates spot status and recovers associated sensor")
    void onEvent_technicianRepair_updatesSpotAndRecoversSensor() {
        UUID spotId = UUID.randomUUID();
        ParkingSpot spot = spotWithStatus(spotId, "out_of_service");
        when(parkingSpotRepository.findById(spotId)).thenReturn(Optional.of(spot));

        String expectedSensorId = "IR-" + spotId.toString().replace("-", "").substring(0, 16);

        String payload = """
            {
              "eventId": "%s",
              "eventType": "spot.status.changed",
              "parkId": "%s",
              "spotId": "%s",
              "previousStatus": "out_of_service",
              "status": "free",
              "occurredAt": "2026-05-18T10:00:00Z",
              "version": 1,
              "payload": {
                "reason": "TECHNICIAN_REPAIR",
                "faultDurationSeconds": 180.0
              }
            }
            """.formatted(UUID.randomUUID(), UUID.randomUUID(), spotId);

        listener.onEvent(payload);

        verify(sensorLogsService).recoverSensor(expectedSensorId, "TECHNICIAN_REPAIR");
    }

    @Test
    @DisplayName("regular vehicle_entered event does not trigger sensor recovery")
    void onEvent_vehicleEntered_doesNotRecoverSensor() {
        UUID spotId = UUID.randomUUID();
        ParkingSpot spot = spotWithStatus(spotId, "free");
        when(parkingSpotRepository.findById(spotId)).thenReturn(Optional.of(spot));

        String payload = """
            {
              "eventId": "%s",
              "eventType": "spot.status.changed",
              "parkId": "%s",
              "spotId": "%s",
              "previousStatus": "free",
              "status": "occupied",
              "occurredAt": "2026-05-18T10:00:00Z",
              "version": 1,
              "payload": {
                "reason": "vehicle_entered"
              }
            }
            """.formatted(UUID.randomUUID(), UUID.randomUUID(), spotId);

        listener.onEvent(payload);

        verify(sensorLogsService, never()).recoverSensor(any(), any());
    }

    @Test
    @DisplayName("still_faulty reason from out_of_service does not trigger recovery")
    void onEvent_stillFaulty_doesNotRecoverSensor() {
        UUID spotId = UUID.randomUUID();
        ParkingSpot spot = spotWithStatus(spotId, "out_of_service");
        when(parkingSpotRepository.findById(spotId)).thenReturn(Optional.of(spot));

        String payload = """
            {
              "eventId": "%s",
              "eventType": "spot.status.changed",
              "parkId": "%s",
              "spotId": "%s",
              "previousStatus": "out_of_service",
              "status": "free",
              "occurredAt": "2026-05-18T10:00:00Z",
              "version": 1,
              "payload": {
                "reason": "recovered"
              }
            }
            """.formatted(UUID.randomUUID(), UUID.randomUUID(), spotId);

        listener.onEvent(payload);

        // reason "recovered" is the old format — not AUTO_RECOVERY/TECHNICIAN_REPAIR, no sensor recovery
        verify(sensorLogsService, never()).recoverSensor(any(), any());
    }

    @Test
    @DisplayName("event for unknown spot is ignored gracefully")
    void onEvent_unknownSpot_ignoredWithoutException() {
        UUID spotId = UUID.randomUUID();
        when(parkingSpotRepository.findById(spotId)).thenReturn(Optional.empty());

        String payload = """
            {
              "eventId": "%s",
              "eventType": "spot.status.changed",
              "parkId": "%s",
              "spotId": "%s",
              "status": "free",
              "occurredAt": "2026-05-18T10:00:00Z",
              "version": 1,
              "payload": {}
            }
            """.formatted(UUID.randomUUID(), UUID.randomUUID(), spotId);

        listener.onEvent(payload);

        verify(parkingSpotRepository, never()).save(any());
        verify(sensorLogsService, never()).recoverSensor(any(), any());
    }

    @Test
    @DisplayName("backend reflects operational state after recovery: spot set to free")
    void onEvent_recovery_backendReflectsOperationalStatus() {
        UUID spotId = UUID.randomUUID();
        ParkingSpot spot = spotWithStatus(spotId, "out_of_service");
        when(parkingSpotRepository.findById(spotId)).thenReturn(Optional.of(spot));

        String payload = """
            {
              "eventId": "%s",
              "eventType": "spot.status.changed",
              "parkId": "%s",
              "spotId": "%s",
              "previousStatus": "out_of_service",
              "status": "free",
              "occurredAt": "2026-05-18T10:00:00Z",
              "version": 1,
              "payload": {
                "reason": "AUTO_RECOVERY",
                "faultDurationSeconds": 67.0
              }
            }
            """.formatted(UUID.randomUUID(), UUID.randomUUID(), spotId);

        listener.onEvent(payload);

        assertThat(spot.getStatus()).isEqualTo("free");
        verify(parkingSpotRepository).save(spot);
    }
}
