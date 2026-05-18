package pt.ua.deti.apieasyspot.ocr.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import pt.ua.deti.apieasyspot.ocr.dto.OcrPlateEvent;
import pt.ua.deti.apieasyspot.ocr.model.OcrPlateRead;
import pt.ua.deti.apieasyspot.ocr.repository.OcrPlateReadRepository;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class OcrPlateEventKafkaListener {

    private final ObjectMapper objectMapper;
    private final OcrPlateReadRepository repository;

    @KafkaListener(
        topics = {"${easyspot.ocr.kafka.topic:parking-ocr-events}"},
        groupId = "${easyspot.ocr.kafka.group-id:easyspot-ocr}"
    )
    public void onEvent(String payload) {
        try {
            OcrPlateEvent event = objectMapper.readValue(payload, OcrPlateEvent.class);

            if (event.parkId() == null || event.payload() == null) {
                log.warn("Ignoring malformed OCR event: missing parkId or payload");
                return;
            }

            OcrPlateEvent.OcrPayload p = event.payload();

            if (p.plate() == null || p.direction() == null) {
                log.warn("Ignoring OCR event with missing plate or direction");
                return;
            }

            if (!isValidDirection(p.direction())) {
                log.warn("Ignoring OCR event with invalid direction '{}': eventId={}", p.direction(), event.eventId());
                return;
            }

            OcrPlateRead read = new OcrPlateRead();
            read.setId(event.eventId() != null ? event.eventId() : UUID.randomUUID());
            read.setParkId(event.parkId());
            read.setSpotId(event.spotId());
            read.setPlate(p.plate().toUpperCase());
            read.setConfidence(p.confidence() != null ? p.confidence() : 0.0);
            read.setDirection(p.direction().toLowerCase());
            read.setOccurredAt(event.occurredAt() != null ? event.occurredAt() : Instant.now());
            read.setExtra(p.extensions() != null ? p.extensions() : Map.of());

            repository.save(read);

            log.debug("OCR read persisted: plate={} direction={} park={} spot={}",
                read.getPlate(), read.getDirection(), read.getParkId(), read.getSpotId());

        } catch (Exception ex) {
            log.warn("Invalid OCR plate event ignored: {}", payload, ex);
        }
    }

    private boolean isValidDirection(String direction) {
        return "entry".equals(direction) || "exit".equals(direction);
    }
}
