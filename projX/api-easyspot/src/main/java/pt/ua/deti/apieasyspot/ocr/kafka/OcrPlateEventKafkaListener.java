package pt.ua.deti.apieasyspot.ocr.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import pt.ua.deti.apieasyspot.gate.service.PaymentGateOrchestrator;
import pt.ua.deti.apieasyspot.ocr.dto.OcrPlateEvent;
import pt.ua.deti.apieasyspot.ocr.model.OcrPlateRead;
import pt.ua.deti.apieasyspot.ocr.repository.OcrPlateReadRepository;
import pt.ua.deti.apieasyspot.sensor.service.SensorLogsService;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class OcrPlateEventKafkaListener {

    private final ObjectMapper objectMapper;
    private final OcrPlateReadRepository repository;
    private final PaymentGateOrchestrator paymentGateOrchestrator;

    private static final java.util.Set<String> VALID_FAILURE_MODES = java.util.Set.of(
        "UNREADABLE", "LOW_CONFIDENCE", "WRONG_PLATE", "CAMERA_OFFLINE", "CAMERA_DEGRADED"
    );
    private final SensorLogsService sensorLogsService;

    @KafkaListener(
        topics = {"${easyspot.ocr.kafka.topic:parking-ocr-events}"},
        groupId = "${easyspot.ocr.kafka.group-id:easyspot-ocr}"
    )
    public void onEvent(String payload) {
        try {
            OcrPlateEvent event = objectMapper.readValue(payload, OcrPlateEvent.class);

            if (event.parkId() == null) {
                log.warn("Ignoring malformed OCR event: missing parkId");
                return;
            }

            if ("device.recovery".equals(event.eventType())) {
                handleDeviceRecovery(event);
                return;
            }

            if ("device.fault".equals(event.eventType())) {
                handleDeviceFault(event);
                return;
            }

            if ("ocr.plate.failure".equals(event.eventType())) {
                log.debug("OCR plate failure event ignored: eventId={}", event.eventId());
                return;
            }

            if (event.payload() == null) {
                log.warn("Ignoring malformed OCR event: missing payload");
                return;
            }

            OcrPlateEvent.OcrPayload p = event.payload();

            if (p.plate() == null || p.direction() == null) {
                log.warn("Ignoring OCR event with missing plate or direction");
                return;
            }

            String direction = p.direction().toLowerCase(java.util.Locale.ROOT);

            if (!isValidDirection(direction)) {
                log.warn("Ignoring OCR event with invalid direction '{}': eventId={}", p.direction(), event.eventId());
                return;
            }

            OcrPlateRead read = new OcrPlateRead();
            read.setId(event.eventId() != null ? event.eventId() : UUID.randomUUID());
            read.setParkId(event.parkId());
            read.setSpotId(event.spotId());
            read.setPlate(p.plate().toUpperCase());
            read.setConfidence(p.confidence() != null ? p.confidence() : 0.0);
            read.setDirection(direction);
            read.setOccurredAt(event.occurredAt() != null ? event.occurredAt() : Instant.now());
            read.setExtra(p.extensions() != null ? p.extensions() : Map.of());

            repository.save(read);

            log.debug("OCR read persisted: plate={} direction={} park={} spot={}",
                read.getPlate(), read.getDirection(), read.getParkId(), read.getSpotId());

            if ("exit".equals(direction)) {
                paymentGateOrchestrator.onExitOcrEvent(event);
            }

        } catch (Exception ex) {
            log.warn("Invalid OCR plate event ignored: {}", payload, ex);
        }
    }

    private void handleDeviceFault(OcrPlateEvent event) {
        if (event.payload() == null || event.payload().extensions() == null) {
            log.warn("device.fault event missing extensions: park={}", event.parkId());
            return;
        }
        Map<String, Object> ext = event.payload().extensions();
        Object deviceIdObj = ext.get("deviceId");
        if (!(deviceIdObj instanceof String deviceId) || deviceId.isBlank()) {
            log.warn("device.fault event missing deviceId: park={}", event.parkId());
            return;
        }
        sensorLogsService.faultSensor(deviceId);
        log.info("OCR device fault registered: deviceId={} park={}", deviceId, event.parkId());
    }

    private void handleDeviceRecovery(OcrPlateEvent event) {
        if (event.payload() == null || event.payload().extensions() == null) {
            log.warn("device.recovery event missing extensions: park={}", event.parkId());
            return;
        }
        Map<String, Object> ext = event.payload().extensions();
        Object deviceIdObj = ext.get("deviceId");
        if (!(deviceIdObj instanceof String deviceId) || deviceId.isBlank()) {
            log.warn("device.recovery event missing deviceId: park={}", event.parkId());
            return;
        }
        String recoveryType = ext.get("recoveryType") instanceof String s ? s : "AUTO_RECOVERY";
        sensorLogsService.recoverSensor(deviceId, recoveryType);
        log.info("OCR device recovered: deviceId={} type={} park={}", deviceId, recoveryType, event.parkId());
    }

    private boolean isValidDirection(String direction) {
        return "entry".equals(direction) || "exit".equals(direction);
    }
}
