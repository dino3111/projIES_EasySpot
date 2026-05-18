package pt.ua.deti.apieasyspot.ocr.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
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
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
        listener = new OcrPlateEventKafkaListener(objectMapper, repository);
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
}
