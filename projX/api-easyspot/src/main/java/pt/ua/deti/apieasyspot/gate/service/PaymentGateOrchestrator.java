package pt.ua.deti.apieasyspot.gate.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import pt.ua.deti.apieasyspot.billing.model.PaymentRecord;
import pt.ua.deti.apieasyspot.billing.model.PaymentStatus;
import pt.ua.deti.apieasyspot.billing.repository.PaymentRecordRepository;
import pt.ua.deti.apieasyspot.booking.model.Reservation;
import pt.ua.deti.apieasyspot.booking.repository.ReservationRepository;
import pt.ua.deti.apieasyspot.gate.dto.GateCommand;
import pt.ua.deti.apieasyspot.gate.kafka.GateCommandKafkaProducer;
import pt.ua.deti.apieasyspot.ocr.dto.OcrPlateEvent;
import pt.ua.deti.apieasyspot.vehicle.model.Vehicle;
import pt.ua.deti.apieasyspot.vehicle.repository.VehicleRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentGateOrchestrator {

    private static final List<PaymentStatus> APPROVED_STATUSES =
        List.of(PaymentStatus.COMPLETED);

    private final VehicleRepository vehicleRepository;
    private final ReservationRepository reservationRepository;
    private final PaymentRecordRepository paymentRecordRepository;
    private final GateCommandKafkaProducer gateCommandProducer;

    public void onExitOcrEvent(OcrPlateEvent event) {
        if (event.parkId() == null || event.payload() == null) {
            return;
        }

        OcrPlateEvent.OcrPayload payload = event.payload();
        String plate = payload.plate();
        UUID parkId = event.parkId();

        if (plate == null || plate.isBlank()) {
            log.warn("Exit OCR event has no plate — cannot authorize gate: parkId={}", parkId);
            issueBlockCommand(parkId, null, null, null, "no_plate");
            return;
        }

        String normalizedPlate = plate.toUpperCase().trim();

        Optional<Vehicle> vehicleOpt = vehicleRepository.findByPlate(normalizedPlate);
        if (vehicleOpt.isEmpty()) {
            log.warn("Exit OCR plate {} not found in vehicles — blocking gate: parkId={}", normalizedPlate, parkId);
            issueBlockCommand(parkId, null, normalizedPlate, null, "unknown_plate");
            return;
        }

        Vehicle vehicle = vehicleOpt.get();
        List<Reservation> activeReservations =
            reservationRepository.findActiveByVehicleIdAndParkId(vehicle.getId(), parkId);

        if (activeReservations.isEmpty()) {
            log.warn("No active reservation for plate {} at park {} — blocking gate", normalizedPlate, parkId);
            issueBlockCommand(parkId, null, normalizedPlate, null, "no_active_reservation");
            return;
        }

        Reservation reservation = activeReservations.get(0);
        Optional<PaymentRecord> paymentRecordOpt =
            paymentRecordRepository.findTopByReservationIdOrderByCreatedAtDesc(reservation.getId());

        if (paymentRecordOpt.isEmpty()) {
            log.warn("No payment record for reservation {} plate {} — blocking exit gate",
                reservation.getBookingCode(), normalizedPlate);
            issueBlockCommand(parkId, gateIdFor(parkId), normalizedPlate, reservation.getId(), "no_payment_record");
            return;
        }

        PaymentRecord paymentRecord = paymentRecordOpt.get();
        boolean approved = APPROVED_STATUSES.contains(paymentRecord.getStatus());

        if (approved) {
            log.info("Payment APPROVED for reservation {} plate {} — opening exit gate at park {}",
                reservation.getBookingCode(), normalizedPlate, parkId);
            issueOpenCommand(parkId, gateIdFor(parkId), normalizedPlate, reservation.getId());
        } else {
            log.warn("Payment NOT approved (status={}) for reservation {} plate {} — blocking exit gate at park {}",
                paymentRecord.getStatus(), reservation.getBookingCode(), normalizedPlate, parkId);
            issueBlockCommand(parkId, gateIdFor(parkId), normalizedPlate, reservation.getId(),
                "payment_status_" + paymentRecord.getStatus().name().toLowerCase());
        }
    }

    private void issueOpenCommand(UUID parkId, String gateId, String plate, UUID reservationId) {
        GateCommand command = new GateCommand(
            UUID.randomUUID(),
            "OPEN_GATE",
            parkId,
            gateId,
            "exit",
            plate,
            reservationId,
            "payment_approved",
            Instant.now()
        );
        gateCommandProducer.send(command);
    }

    private void issueBlockCommand(UUID parkId, String gateId, String plate, UUID reservationId, String reason) {
        GateCommand command = new GateCommand(
            UUID.randomUUID(),
            "BLOCK_GATE",
            parkId,
            gateId != null ? gateId : "gate-" + parkId.toString().substring(0, 8) + "-exit",
            "exit",
            plate,
            reservationId,
            reason,
            Instant.now()
        );
        gateCommandProducer.send(command);
    }

    private String gateIdFor(UUID parkId) {
        return "gate-" + parkId.toString().substring(0, 8) + "-exit";
    }
}
