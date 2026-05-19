package pt.ua.deti.apieasyspot.ocr.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import pt.ua.deti.apieasyspot.gate.service.PaymentGateOrchestrator;
import pt.ua.deti.apieasyspot.ocr.model.OcrPlateRead;
import pt.ua.deti.apieasyspot.ocr.repository.OcrPlateReadRepository;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class OcrPlateEventKafkaListenerTest {

    private OcrPlateReadRepository repository;
    private OcrPlateEventKafkaListener listener;

    @BeforeEach
    void setUp() {
        repository = mock(OcrPlateReadRepository.class);
        PaymentGateOrchestrator paymentGateOrchestrator = mock(PaymentGateOrchestrator.class);
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
        listener = new OcrPlateEventKafkaListener(objectMapper, repository, paymentGateOrchestrator);
    }

    @Test
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

        verify(repository, never()).save(org.mockito.ArgumentMatchers.any(OcrPlateRead.class));
    }

    // ------------------------------------------------------------------
    // OCR failure mode tests
    // ------------------------------------------------------------------

    @Test
    void onEvent_unreadable_persistsWithFailureMode() {
        UUID parkId = UUID.randomUUID();
        String payload = """
            {
              "eventId": "%s",
              "eventType": "ocr.plate.failure",
              "parkId": "%s",
              "occurredAt": "2026-05-18T10:00:00Z",
              "version": 1,
              "payload": {
                "plate": "",
                "confidence": 0.0,
                "direction": "entry",
                "failureMode": "UNREADABLE"
              }
            }
            """.formatted(UUID.randomUUID(), parkId);

        listener.onEvent(payload);

        ArgumentCaptor<OcrPlateRead> captor = ArgumentCaptor.forClass(OcrPlateRead.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getFailureMode()).isEqualTo("UNREADABLE");
        assertThat(captor.getValue().getPlate()).isEqualTo("");
        assertThat(captor.getValue().getConfidence()).isEqualTo(0.0);
    }

    @Test
    void onEvent_lowConfidence_persistsWithFailureMode() {
        UUID parkId = UUID.randomUUID();
        String payload = """
            {
              "eventId": "%s",
              "eventType": "ocr.plate.failure",
              "parkId": "%s",
              "occurredAt": "2026-05-18T10:01:00Z",
              "version": 1,
              "payload": {
                "plate": "AB-12-CD",
                "confidence": 0.23,
                "direction": "exit",
                "failureMode": "LOW_CONFIDENCE"
              }
            }
            """.formatted(UUID.randomUUID(), parkId);

        listener.onEvent(payload);

        ArgumentCaptor<OcrPlateRead> captor = ArgumentCaptor.forClass(OcrPlateRead.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getFailureMode()).isEqualTo("LOW_CONFIDENCE");
        assertThat(captor.getValue().getPlate()).isEqualTo("AB-12-CD");
    }

    @Test
    void onEvent_wrongPlate_persistsWithFailureMode() {
        UUID parkId = UUID.randomUUID();
        String payload = """
            {
              "eventId": "%s",
              "eventType": "ocr.plate.failure",
              "parkId": "%s",
              "occurredAt": "2026-05-18T10:02:00Z",
              "version": 1,
              "payload": {
                "plate": "A1-12-CD",
                "confidence": 0.61,
                "direction": "entry",
                "failureMode": "WRONG_PLATE"
              }
            }
            """.formatted(UUID.randomUUID(), parkId);

        listener.onEvent(payload);

        ArgumentCaptor<OcrPlateRead> captor = ArgumentCaptor.forClass(OcrPlateRead.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getFailureMode()).isEqualTo("WRONG_PLATE");
    }

    @Test
    void onEvent_cameraOffline_persistsWithFailureMode() {
        UUID parkId = UUID.randomUUID();
        String payload = """
            {
              "eventId": "%s",
              "eventType": "ocr.plate.failure",
              "parkId": "%s",
              "occurredAt": "2026-05-18T10:03:00Z",
              "version": 1,
              "payload": {
                "plate": "",
                "confidence": 0.0,
                "direction": "entry",
                "failureMode": "CAMERA_OFFLINE"
              }
            }
            """.formatted(UUID.randomUUID(), parkId);

        listener.onEvent(payload);

        ArgumentCaptor<OcrPlateRead> captor = ArgumentCaptor.forClass(OcrPlateRead.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getFailureMode()).isEqualTo("CAMERA_OFFLINE");
    }

    @Test
    void onEvent_cameraDegraded_persistsWithFailureMode() {
        UUID parkId = UUID.randomUUID();
        String payload = """
            {
              "eventId": "%s",
              "eventType": "ocr.plate.failure",
              "parkId": "%s",
              "occurredAt": "2026-05-18T10:04:00Z",
              "version": 1,
              "payload": {
                "plate": "AB-12-CD",
                "confidence": 0.48,
                "direction": "exit",
                "failureMode": "CAMERA_DEGRADED"
              }
            }
            """.formatted(UUID.randomUUID(), parkId);

        listener.onEvent(payload);

        ArgumentCaptor<OcrPlateRead> captor = ArgumentCaptor.forClass(OcrPlateRead.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getFailureMode()).isEqualTo("CAMERA_DEGRADED");
    }

    @Test
    void onEvent_unknownFailureMode_doesNotPersist() {
        UUID parkId = UUID.randomUUID();
        String payload = """
            {
              "eventId": "%s",
              "eventType": "ocr.plate.failure",
              "parkId": "%s",
              "occurredAt": "2026-05-18T10:05:00Z",
              "version": 1,
              "payload": {
                "plate": "",
                "confidence": 0.0,
                "direction": "entry",
                "failureMode": "COSMIC_RAY"
              }
            }
            """.formatted(UUID.randomUUID(), parkId);

        listener.onEvent(payload);

        verify(repository, never()).save(org.mockito.ArgumentMatchers.any(OcrPlateRead.class));
    }

    @Test
    void onEvent_normalRead_hasNullFailureMode() {
        UUID parkId = UUID.randomUUID();
        String payload = """
            {
              "eventId": "%s",
              "eventType": "ocr.plate.read",
              "parkId": "%s",
              "occurredAt": "2026-05-18T10:06:00Z",
              "version": 1,
              "payload": {
                "plate": "AB-12-CD",
                "confidence": 0.95,
                "direction": "entry"
              }
            }
            """.formatted(UUID.randomUUID(), parkId);

        listener.onEvent(payload);

        ArgumentCaptor<OcrPlateRead> captor = ArgumentCaptor.forClass(OcrPlateRead.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getFailureMode()).isNull();
    }

    @Test
    void onEvent_missingParkId_doesNotPersist() {
        String payload = """
            {
              "eventId": "%s",
              "eventType": "ocr.plate.failure",
              "occurredAt": "2026-05-18T10:07:00Z",
              "version": 1,
              "payload": {
                "plate": "",
                "confidence": 0.0,
                "direction": "entry",
                "failureMode": "UNREADABLE"
              }
            }
            """.formatted(UUID.randomUUID());

        listener.onEvent(payload);

        verify(repository, never()).save(org.mockito.ArgumentMatchers.any(OcrPlateRead.class));
    }
}
