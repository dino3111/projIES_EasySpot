package pt.ua.deti.apieasyspot.gate.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import pt.ua.deti.apieasyspot.billing.model.PaymentRecord;
import pt.ua.deti.apieasyspot.billing.model.PaymentStatus;
import pt.ua.deti.apieasyspot.billing.repository.PaymentRecordRepository;
import pt.ua.deti.apieasyspot.billing.service.BillingService;
import pt.ua.deti.apieasyspot.booking.model.Reservation;
import pt.ua.deti.apieasyspot.booking.model.ReservationStatus;
import pt.ua.deti.apieasyspot.booking.repository.ReservationRepository;
import pt.ua.deti.apieasyspot.gate.dto.GateCommand;
import pt.ua.deti.apieasyspot.gate.kafka.GateCommandKafkaProducer;
import pt.ua.deti.apieasyspot.ocr.dto.OcrPlateEvent;
import pt.ua.deti.apieasyspot.vehicle.model.Vehicle;
import pt.ua.deti.apieasyspot.vehicle.repository.VehicleRepository;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentGateOrchestrator {

    private static final List<PaymentStatus> COMPLETED_STATUSES =
        List.of(PaymentStatus.COMPLETED);

    private final VehicleRepository vehicleRepository;
    private final ReservationRepository reservationRepository;
    private final PaymentRecordRepository paymentRecordRepository;
    private final GateCommandKafkaProducer gateCommandProducer;
    private final BillingService billingService;

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
        OffsetDateTime now = OffsetDateTime.now();
        // Bug 1 fix: filter by temporal window matching the OCR event time
        List<Reservation> activeReservations =
            reservationRepository.findActiveByVehicleIdAndParkId(vehicle.getId(), parkId, now);

        if (activeReservations.isEmpty()) {
            log.warn("No active reservation for plate {} at park {} at {} — blocking gate", normalizedPlate, parkId, now);
            issueBlockCommand(parkId, null, normalizedPlate, null, "no_active_reservation");
            return;
        }

        Reservation reservation = activeReservations.get(0);

        // Bug 5 fix: idempotency — if reservation already COMPLETED, just open gate (re-delivery)
        if (reservation.getStatus() == ReservationStatus.COMPLETED) {
            log.info("Reservation {} already COMPLETED (re-delivery) — opening exit gate at park {}",
                reservation.getBookingCode(), parkId);
            issueOpenCommand(parkId, gateIdFor(parkId), normalizedPlate, reservation.getId());
            return;
        }

        // Bug 4 fix: settle billing at exit time, calculate real duration cost
        String customerEmail = reservation.getUser() != null ? reservation.getUser().getEmail() : null;
        try {
            billingService.settleReservationOnExit(reservation, now, customerEmail);
        } catch (Exception ex) {
            log.warn("Billing settlement failed for reservation {} plate {} — proceeding with existing payment record: {}",
                reservation.getBookingCode(), normalizedPlate, ex.getMessage());
        }

        // Bug 2 fix: look for any COMPLETED record, not just the most recent (which may be an adjustment/refund)
        Optional<PaymentRecord> completedPayment =
            paymentRecordRepository.findFirstByReservationIdAndStatusInOrderByCreatedAtDesc(
                reservation.getId(), COMPLETED_STATUSES);

        if (completedPayment.isEmpty()) {
            log.warn("No COMPLETED payment for reservation {} plate {} — blocking exit gate at park {}",
                reservation.getBookingCode(), normalizedPlate, parkId);
            issueBlockCommand(parkId, gateIdFor(parkId), normalizedPlate, reservation.getId(), "no_payment_record");
            return;
        }

        // Mark reservation COMPLETED before opening gate
        try {
            reservation.setStatus(ReservationStatus.COMPLETED);
            reservationRepository.save(reservation);
        } catch (Exception ex) {
            log.warn("Failed to mark reservation {} as COMPLETED: {}", reservation.getBookingCode(), ex.getMessage());
        }

        log.info("Payment COMPLETED for reservation {} plate {} — opening exit gate at park {}",
            reservation.getBookingCode(), normalizedPlate, parkId);
        issueOpenCommand(parkId, gateIdFor(parkId), normalizedPlate, reservation.getId());
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
            gateId != null ? gateId : gateIdFor(parkId),
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
