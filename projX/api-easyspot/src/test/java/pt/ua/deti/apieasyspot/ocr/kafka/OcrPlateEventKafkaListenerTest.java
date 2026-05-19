package pt.ua.deti.apieasyspot.ocr.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import pt.ua.deti.apieasyspot.billing.service.BillingService;
import pt.ua.deti.apieasyspot.ocr.model.OcrPlateRead;
import pt.ua.deti.apieasyspot.ocr.repository.OcrPlateReadRepository;
import pt.ua.deti.apieasyspot.sensor.service.SensorLogsService;
import pt.ua.deti.apieasyspot.booking.repository.ReservationRepository;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class OcrPlateEventKafkaListenerTest {

    private OcrPlateReadRepository repository;
    private SensorLogsService sensorLogsService;
    private ReservationRepository reservationRepository;
    private BillingService billingService;
    private OcrPlateEventKafkaListener listener;

    @BeforeEach
    void setUp() {
        repository = mock(OcrPlateReadRepository.class);
        sensorLogsService = mock(SensorLogsService.class);
        reservationRepository = mock(ReservationRepository.class);
        billingService = mock(BillingService.class);
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
        listener = new OcrPlateEventKafkaListener(objectMapper, repository, sensorLogsService, reservationRepository, billingService);
    }

    @Test
    @DisplayName("plate read event is persisted with extensions in extra")
    void onEvent_persistsExtensionsInExtra() {
        UUID eventId = UUID.randomUUID();
        UUID parkId = UUID.randomUUID();
        UUID spotId = UUID.randomUUID();
        Instant occurredAt = Instant.parse("2026-05-17T20:15:30Z");

        String payload = """
            {
              "eventId": "%s",
              "eventType": "ocr.plate.read",
              "parkId": "%s",
              "spotId": "%s",
              "occurredAt": "%s",
              "version": 1,
              "payload": {
                "plate": "ab-12-cd",
                "confidence": 0.9721,
                "direction": "entry",
                "parkName": "Parque A",
                "spotNumber": "A1",
                "zone": "STANDARD",
                "row": 1,
                "col": 1,
                "extensions": {
                  "cameraId": "CAM-01",
                  "lane": "entry-east"
                }
              }
            }
            """.formatted(eventId, parkId, spotId, occurredAt);

        listener.onEvent(payload);

        ArgumentCaptor<OcrPlateRead> captor = ArgumentCaptor.forClass(OcrPlateRead.class);
        verify(repository).save(captor.capture());

        OcrPlateRead saved = captor.getValue();
        assertThat(saved.getId()).isEqualTo(eventId);
        assertThat(saved.getParkId()).isEqualTo(parkId);
        assertThat(saved.getSpotId()).isEqualTo(spotId);
        assertThat(saved.getPlate()).isEqualTo("AB-12-CD");
        assertThat(saved.getDirection()).isEqualTo("entry");
        assertThat(saved.getOccurredAt()).isEqualTo(occurredAt);
        assertThat(saved.getExtra())
            .isEqualTo(Map.of("cameraId", "CAM-01", "lane", "entry-east"));
    }

    @Test
    @DisplayName("event with invalid direction is not persisted")
    void onEvent_invalidDirection_doesNotPersist() {
        String payload = """
            {
              "eventId": "%s",
              "eventType": "ocr.plate.read",
              "parkId": "%s",
              "spotId": "%s",
              "occurredAt": "2026-05-17T20:15:30Z",
              "version": 1,
              "payload": {
                "plate": "AB-12-CD",
                "confidence": 0.9721,
                "direction": "sideways"
              }
            }
            """.formatted(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());

        listener.onEvent(payload);

        verify(repository, never()).save(any(OcrPlateRead.class));
    }

    @Test
    @DisplayName("device.recovery event triggers sensor recovery without persisting a plate read")
    void onEvent_deviceRecovery_callsRecoverSensorAndSkipsPersist() {
        UUID parkId = UUID.randomUUID();
        String parkKey = parkId.toString().replace("-", "").substring(0, 8).toUpperCase();
        String deviceId = "OCR-" + parkKey + "-ENT1";

        String payload = """
            {
              "eventId": "%s",
              "eventType": "device.recovery",
              "parkId": "%s",
              "spotId": null,
              "occurredAt": "2026-05-18T10:00:00Z",
              "version": 1,
              "payload": {
                "plate": null,
                "confidence": null,
                "direction": null,
                "parkName": "Parque Test",
                "extensions": {
                  "deviceType": "OCR_CAMERA",
                  "deviceId": "%s",
                  "recoveryType": "AUTO_RECOVERY",
                  "faultDurationSeconds": 65.4
                }
              }
            }
            """.formatted(UUID.randomUUID(), parkId, deviceId);

        listener.onEvent(payload);

        verify(sensorLogsService).recoverSensor(deviceId, "AUTO_RECOVERY");
        verify(repository, never()).save(any(OcrPlateRead.class));
    }

    @Test
    @DisplayName("device.recovery with TECHNICIAN_REPAIR type forwards the correct recovery type")
    void onEvent_deviceRecovery_technicianRepair_forwardsType() {
        UUID parkId = UUID.randomUUID();
        String parkKey = parkId.toString().replace("-", "").substring(0, 8).toUpperCase();
        String deviceId = "OCR-" + parkKey + "-ENT1";

        String payload = """
            {
              "eventId": "%s",
              "eventType": "device.recovery",
              "parkId": "%s",
              "spotId": null,
              "occurredAt": "2026-05-18T10:00:00Z",
              "version": 1,
              "payload": {
                "extensions": {
                  "deviceId": "%s",
                  "recoveryType": "TECHNICIAN_REPAIR",
                  "faultDurationSeconds": 310.0
                }
              }
            }
            """.formatted(UUID.randomUUID(), parkId, deviceId);

        listener.onEvent(payload);

        verify(sensorLogsService).recoverSensor(deviceId, "TECHNICIAN_REPAIR");
    }

    @Test
    @DisplayName("device.fault event marks sensor offline without persisting a plate read")
    void onEvent_deviceFault_callsFaultSensorAndSkipsPersist() {
        UUID parkId = UUID.randomUUID();
        String deviceId = "OCR-TEST-ENT1";

        String payload = """
            {
              "eventId": "%s",
              "eventType": "device.fault",
              "parkId": "%s",
              "spotId": null,
              "occurredAt": "2026-05-18T10:00:00Z",
              "version": 1,
              "payload": {
                "extensions": {
                  "deviceType": "OCR_CAMERA",
                  "deviceId": "%s"
                }
              }
            }
            """.formatted(UUID.randomUUID(), parkId, deviceId);

        listener.onEvent(payload);

        verify(sensorLogsService).faultSensor(deviceId);
        verify(repository, never()).save(any(OcrPlateRead.class));
        verify(sensorLogsService, never()).recoverSensor(any(), any());
    }

    @Test
    @DisplayName("device.fault with missing deviceId is silently ignored")
    void onEvent_deviceFault_missingDeviceId_ignored() {
        UUID parkId = UUID.randomUUID();

        String payload = """
            {
              "eventId": "%s",
              "eventType": "device.fault",
              "parkId": "%s",
              "spotId": null,
              "occurredAt": "2026-05-18T10:00:00Z",
              "version": 1,
              "payload": {
                "extensions": {
                  "deviceType": "OCR_CAMERA"
                }
              }
            }
            """.formatted(UUID.randomUUID(), parkId);

        listener.onEvent(payload);

        verify(sensorLogsService, never()).faultSensor(any());
        verify(repository, never()).save(any(OcrPlateRead.class));
    }

    @Test
    @DisplayName("ocr.plate.failure event is ignored and not persisted as plate read")
    void onEvent_plateFailure_isIgnored() {
        UUID parkId = UUID.randomUUID();

        String payload = """
            {
              "eventId": "%s",
              "eventType": "ocr.plate.failure",
              "parkId": "%s",
              "spotId": null,
              "occurredAt": "2026-05-18T10:00:00Z",
              "version": 1,
              "payload": {
                "plate": "",
                "confidence": 0.0,
                "direction": "sideways",
                "failureMode": "UNREADABLE"
              }
            }
            """.formatted(UUID.randomUUID(), parkId);

        listener.onEvent(payload);

        verify(repository, never()).save(any(OcrPlateRead.class));
    }

    @Test
    void onEvent_failureAnyDirection_persistsWithFailureMode() {
        UUID parkId = UUID.randomUUID();

        String payload = """
            {
              "eventId": "%s",
              "eventType": "ocr.plate.failure",
              "parkId": "%s",
              "spotId": null,
              "occurredAt": "2026-05-17T20:15:30Z",
              "version": 1,
              "payload": {
                "plate": "",
                "confidence": 0.0,
                "direction": "sideways",
                "failureMode": "UNREADABLE"
              }
            }
            """.formatted(UUID.randomUUID(), parkId);

        listener.onEvent(payload);

        ArgumentCaptor<OcrPlateRead> captor = ArgumentCaptor.forClass(OcrPlateRead.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getFailureMode()).isEqualTo("UNREADABLE");
    }

    @Test
    void onEvent_unknownFailureMode_doesNotPersist() {
        String payload = """
            {
              "eventId": "%s",
              "eventType": "ocr.plate.failure",
              "parkId": "%s",
              "occurredAt": "2026-05-17T20:15:30Z",
              "version": 1,
              "payload": {
                "plate": "",
                "confidence": 0.0,
                "direction": "entry",
                "failureMode": "UNREADABLE"
              }
            }
            """.formatted(UUID.randomUUID(), UUID.randomUUID());

        listener.onEvent(payload);

        verify(repository, never()).save(any(OcrPlateRead.class));
        verify(sensorLogsService, never()).faultSensor(any());
        verify(sensorLogsService, never()).recoverSensor(any(), any());
    }

    @Test
    @DisplayName("device.recovery with missing deviceId is silently ignored")
    void onEvent_deviceRecovery_missingDeviceId_ignored() {
        UUID parkId = UUID.randomUUID();

        String payload = """
            {
              "eventId": "%s",
              "eventType": "device.recovery",
              "parkId": "%s",
              "spotId": null,
              "occurredAt": "2026-05-18T10:00:00Z",
              "version": 1,
              "payload": {
                "extensions": {
                  "recoveryType": "AUTO_RECOVERY"
                }
              }
            }
            """.formatted(UUID.randomUUID(), parkId);

        listener.onEvent(payload);

        verify(sensorLogsService, never()).recoverSensor(any(), any());
    }
}
