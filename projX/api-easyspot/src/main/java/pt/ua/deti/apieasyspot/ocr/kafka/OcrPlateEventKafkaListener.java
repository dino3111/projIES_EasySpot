package pt.ua.deti.apieasyspot.ocr.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import pt.ua.deti.apieasyspot.billing.service.BillingService;
import pt.ua.deti.apieasyspot.booking.model.Reservation;
import pt.ua.deti.apieasyspot.booking.model.ReservationStatus;
import pt.ua.deti.apieasyspot.booking.repository.ReservationRepository;
import pt.ua.deti.apieasyspot.ocr.dto.OcrPlateEvent;
import pt.ua.deti.apieasyspot.ocr.model.OcrPlateRead;
import pt.ua.deti.apieasyspot.ocr.repository.OcrPlateReadRepository;
import pt.ua.deti.apieasyspot.sensor.service.SensorLogsService;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class OcrPlateEventKafkaListener {

    private final ObjectMapper objectMapper;
    private final OcrPlateReadRepository repository;
    private final SensorLogsService sensorLogsService;
    private final ReservationRepository reservationRepository;
    private final BillingService billingService;

    private static final java.util.Set<String> VALID_FAILURE_MODES = java.util.Set.of(
        "UNREADABLE", "LOW_CONFIDENCE", "WRONG_PLATE", "CAMERA_OFFLINE", "CAMERA_DEGRADED"
    );

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
                OcrPlateEvent.OcrPayload fp = event.payload();
                String failureMode = fp != null ? fp.failureMode() : null;
                if (failureMode != null && VALID_FAILURE_MODES.contains(failureMode)) {
                    handleFailure(event, fp, failureMode);
                } else {
                    log.debug("OCR plate failure event ignored (unknown/missing failureMode): eventId={}", event.eventId());
                }
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
            if (!isValidDirection(p.direction())) {
                log.warn("Ignoring OCR event with invalid direction '{}': eventId={}", p.direction(), event.eventId());
                return;
            }

            OcrPlateRead read = buildRead(event, p);
            repository.save(read);

            log.debug("OCR read persisted: plate={} direction={} park={} spot={}",
                read.getPlate(), read.getDirection(), read.getParkId(), read.getSpotId());
            handleReservationLifecycle(event, read);

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

    private void handleFailure(OcrPlateEvent event, OcrPlateEvent.OcrPayload p, String mode) {
        OcrPlateRead read = buildRead(event, p);
        read.setFailureMode(mode);
        repository.save(read);
        log.warn("OCR failure persisted: failureMode={} plate='{}' confidence={} park={} spot={}",
            mode, read.getPlate(), read.getConfidence(), read.getParkId(), read.getSpotId());
    }

    private OcrPlateRead buildRead(OcrPlateEvent event, OcrPlateEvent.OcrPayload p) {
        OcrPlateRead read = new OcrPlateRead();
        read.setId(event.eventId() != null ? event.eventId() : UUID.randomUUID());
        read.setParkId(event.parkId());
        read.setSpotId(event.spotId());
        read.setPlate(normalizePlate(p.plate()));
        read.setConfidence(p.confidence() != null ? p.confidence() : 0.0);
        read.setDirection(p.direction().toLowerCase());
        read.setOccurredAt(event.occurredAt() != null ? event.occurredAt() : Instant.now());
        read.setExtra(p.extensions() != null ? p.extensions() : Map.of());
        return read;
    }

    private void handleReservationLifecycle(OcrPlateEvent event, OcrPlateRead read) {
        if (read.getPlate().isBlank() || read.getParkId() == null) {
            return;
        }
        OffsetDateTime occurredAt = read.getOccurredAt().atOffset(ZoneOffset.UTC);
        List<Reservation> candidates = reservationRepository
            .findByParkIdAndVehiclePlateAndStatusInOrderByDepartureTimeAsc(
                read.getParkId(),
                read.getPlate(),
                List.of(ReservationStatus.CONFIRMED, ReservationStatus.PENDING)
            );
        Reservation reservation = pickReservation(candidates, occurredAt, read.getDirection());
        if (reservation == null) {
            return;
        }

        if ("entry".equals(read.getDirection())) {
            billingService.registerReservationEntry(reservation, occurredAt);
            return;
        }

        BillingService.PaymentAdjustmentResult adjustment = billingService.settleReservationOnExit(
            reservation,
            occurredAt,
            reservation.getUser() != null ? reservation.getUser().getEmail() : null
        );
        reservation.setStatus(ReservationStatus.COMPLETED);
        reservation.setLockedUntil(null);
        reservationRepository.save(reservation);
        if (adjustment != null && adjustment.delta() != null && adjustment.delta().signum() > 0) {
            log.info("Reservation {} exit settled with extra charge {} ({})",
                reservation.getBookingCode(), adjustment.delta(), adjustment.kind());
        }
    }

    private Reservation pickReservation(List<Reservation> candidates, OffsetDateTime occurredAt, String direction) {
        if (candidates == null || candidates.isEmpty()) {
            return null;
        }
        if ("exit".equals(direction)) {
            return candidates.stream()
                .filter(r -> !occurredAt.isBefore(r.getArrivalTime().minusHours(2)))
                .filter(r -> !occurredAt.isAfter(r.getDepartureTime().plusHours(24)))
                .min(Comparator.comparing(Reservation::getDepartureTime))
                .orElse(null);
        }
        return candidates.stream()
            .filter(r -> !occurredAt.isBefore(r.getArrivalTime().minusHours(6)))
            .filter(r -> !occurredAt.isAfter(r.getDepartureTime()))
            .min(Comparator.comparing(Reservation::getArrivalTime))
            .orElse(null);
    }

    private String normalizePlate(String plate) {
        return plate == null ? "" : plate.trim().toUpperCase();
    }

    private boolean isValidDirection(String direction) {
        return direction != null && ("entry".equals(direction) || "exit".equals(direction));
    }
}
