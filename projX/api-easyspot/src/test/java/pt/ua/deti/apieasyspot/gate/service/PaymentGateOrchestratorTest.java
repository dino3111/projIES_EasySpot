package pt.ua.deti.apieasyspot.gate.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
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

import java.math.BigDecimal;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentGateOrchestratorTest {

    @Mock VehicleRepository vehicleRepository;
    @Mock ReservationRepository reservationRepository;
    @Mock PaymentRecordRepository paymentRecordRepository;
    @Mock GateCommandKafkaProducer gateCommandProducer;
    @Mock BillingService billingService;

    @InjectMocks PaymentGateOrchestrator orchestrator;

    private UUID parkId;
    private UUID vehicleId;
    private UUID reservationId;
    private Vehicle vehicle;
    private Reservation reservation;
    private OcrPlateEvent exitEvent;

    @BeforeEach
    void setUp() {
        parkId = UUID.randomUUID();
        vehicleId = UUID.randomUUID();
        reservationId = UUID.randomUUID();

        vehicle = new Vehicle();
        vehicle.setId(vehicleId);
        vehicle.setPlate("AB-12-CD");

        var parkingLot = new pt.ua.deti.apieasyspot.occupancy.model.ParkingLot();
        parkingLot.setId(parkId);

        reservation = new Reservation();
        reservation.setId(reservationId);
        reservation.setParkingLot(parkingLot);
        reservation.setVehicle(vehicle);
        reservation.setBookingCode("TEST-001");
        reservation.setStatus(ReservationStatus.CONFIRMED);

        exitEvent = buildOcrExitEvent(parkId, "AB-12-CD", 0.95);

        // default: settlement returns no change (lenient to avoid UnnecessaryStubbingException in early-exit paths)
        lenient().when(billingService.settleReservationOnExit(any(), any(), any()))
            .thenReturn(new BillingService.PaymentAdjustmentResult(BigDecimal.ZERO, "NO_CHANGE", null, null));
    }

    @Test
    @DisplayName("Payment COMPLETED -> OPEN_GATE command issued for exit gate")
    void approvedPayment_opensExitGate() {
        PaymentRecord record = new PaymentRecord();
        record.setReservationId(reservationId);
        record.setStatus(PaymentStatus.COMPLETED);

        when(vehicleRepository.findByPlate("AB-12-CD")).thenReturn(Optional.of(vehicle));
        when(reservationRepository.findActiveByVehicleIdAndParkId(eq(vehicleId), eq(parkId), any(OffsetDateTime.class)))
            .thenReturn(List.of(reservation));
        when(paymentRecordRepository.findFirstByReservationIdAndStatusInOrderByCreatedAtDesc(eq(reservationId), any(Collection.class)))
            .thenReturn(Optional.of(record));

        orchestrator.onExitOcrEvent(exitEvent);

        ArgumentCaptor<GateCommand> captor = ArgumentCaptor.forClass(GateCommand.class);
        verify(gateCommandProducer).send(captor.capture());
        GateCommand command = captor.getValue();

        assertThat(command.commandType()).isEqualTo("OPEN_GATE");
        assertThat(command.direction()).isEqualTo("exit");
        assertThat(command.parkId()).isEqualTo(parkId);
        assertThat(command.plate()).isEqualTo("AB-12-CD");
        assertThat(command.reservationId()).isEqualTo(reservationId);
        assertThat(command.reason()).isEqualTo("payment_approved");
    }

    @Test
    @DisplayName("Payment PENDING (most recent) but prior COMPLETED exists -> OPEN_GATE")
    void pendingMostRecent_butCompletedExists_opensGate() {
        PaymentRecord completedRecord = new PaymentRecord();
        completedRecord.setReservationId(reservationId);
        completedRecord.setStatus(PaymentStatus.COMPLETED);

        when(vehicleRepository.findByPlate("AB-12-CD")).thenReturn(Optional.of(vehicle));
        when(reservationRepository.findActiveByVehicleIdAndParkId(eq(vehicleId), eq(parkId), any(OffsetDateTime.class)))
            .thenReturn(List.of(reservation));
        when(paymentRecordRepository.findFirstByReservationIdAndStatusInOrderByCreatedAtDesc(eq(reservationId), any(Collection.class)))
            .thenReturn(Optional.of(completedRecord));

        orchestrator.onExitOcrEvent(exitEvent);

        ArgumentCaptor<GateCommand> captor = ArgumentCaptor.forClass(GateCommand.class);
        verify(gateCommandProducer).send(captor.capture());
        assertThat(captor.getValue().commandType()).isEqualTo("OPEN_GATE");
    }

    @Test
    @DisplayName("No COMPLETED payment record -> BLOCK_GATE")
    void noCompletedPayment_blocksExitGate() {
        when(vehicleRepository.findByPlate("AB-12-CD")).thenReturn(Optional.of(vehicle));
        when(reservationRepository.findActiveByVehicleIdAndParkId(eq(vehicleId), eq(parkId), any(OffsetDateTime.class)))
            .thenReturn(List.of(reservation));
        when(paymentRecordRepository.findFirstByReservationIdAndStatusInOrderByCreatedAtDesc(eq(reservationId), any(Collection.class)))
            .thenReturn(Optional.empty());

        orchestrator.onExitOcrEvent(exitEvent);

        ArgumentCaptor<GateCommand> captor = ArgumentCaptor.forClass(GateCommand.class);
        verify(gateCommandProducer).send(captor.capture());
        assertThat(captor.getValue().commandType()).isEqualTo("BLOCK_GATE");
        assertThat(captor.getValue().reason()).isEqualTo("no_payment_record");
    }

    @Test
    @DisplayName("Unknown plate -> BLOCK_GATE with reason unknown_plate")
    void unknownPlate_blocksGate() {
        when(vehicleRepository.findByPlate(any())).thenReturn(Optional.empty());

        orchestrator.onExitOcrEvent(exitEvent);

        ArgumentCaptor<GateCommand> captor = ArgumentCaptor.forClass(GateCommand.class);
        verify(gateCommandProducer).send(captor.capture());
        assertThat(captor.getValue().commandType()).isEqualTo("BLOCK_GATE");
        assertThat(captor.getValue().reason()).isEqualTo("unknown_plate");
    }

    @Test
    @DisplayName("No active reservation in temporal window -> BLOCK_GATE with reason no_active_reservation")
    void noActiveReservation_blocksGate() {
        when(vehicleRepository.findByPlate("AB-12-CD")).thenReturn(Optional.of(vehicle));
        when(reservationRepository.findActiveByVehicleIdAndParkId(eq(vehicleId), eq(parkId), any(OffsetDateTime.class)))
            .thenReturn(List.of());

        orchestrator.onExitOcrEvent(exitEvent);

        ArgumentCaptor<GateCommand> captor = ArgumentCaptor.forClass(GateCommand.class);
        verify(gateCommandProducer).send(captor.capture());
        assertThat(captor.getValue().commandType()).isEqualTo("BLOCK_GATE");
        assertThat(captor.getValue().reason()).isEqualTo("no_active_reservation");
    }

    @Test
    @DisplayName("Reservation already COMPLETED (Kafka re-delivery) -> OPEN_GATE without re-billing")
    void alreadyCompletedReservation_idempotentRedelivery_opensGate() {
        reservation.setStatus(ReservationStatus.COMPLETED);

        when(vehicleRepository.findByPlate("AB-12-CD")).thenReturn(Optional.of(vehicle));
        when(reservationRepository.findActiveByVehicleIdAndParkId(eq(vehicleId), eq(parkId), any(OffsetDateTime.class)))
            .thenReturn(List.of(reservation));

        orchestrator.onExitOcrEvent(exitEvent);

        ArgumentCaptor<GateCommand> captor = ArgumentCaptor.forClass(GateCommand.class);
        verify(gateCommandProducer).send(captor.capture());
        assertThat(captor.getValue().commandType()).isEqualTo("OPEN_GATE");
        // billing must NOT be called again on re-delivery
        verify(billingService, never()).settleReservationOnExit(any(), any(), any());
    }

    @Test
    @DisplayName("Entry OCR event is ignored by orchestrator")
    void entryOcrEvent_isNotTriggeredByOrchestrator() {
        OcrPlateEvent badEvent = new OcrPlateEvent(UUID.randomUUID(), "ocr.plate.read",
            null, null, Instant.now(), null, 1);
        orchestrator.onExitOcrEvent(badEvent);
        verifyNoInteractions(gateCommandProducer);
    }

    @Test
    @DisplayName("Financial decision event correlated: commandId and reservationId present")
    void commandCorrelatesPaymentDecisionWithGateAction() {
        PaymentRecord record = new PaymentRecord();
        record.setReservationId(reservationId);
        record.setStatus(PaymentStatus.COMPLETED);

        when(vehicleRepository.findByPlate("AB-12-CD")).thenReturn(Optional.of(vehicle));
        when(reservationRepository.findActiveByVehicleIdAndParkId(eq(vehicleId), eq(parkId), any(OffsetDateTime.class)))
            .thenReturn(List.of(reservation));
        when(paymentRecordRepository.findFirstByReservationIdAndStatusInOrderByCreatedAtDesc(eq(reservationId), any(Collection.class)))
            .thenReturn(Optional.of(record));

        orchestrator.onExitOcrEvent(exitEvent);

        ArgumentCaptor<GateCommand> captor = ArgumentCaptor.forClass(GateCommand.class);
        verify(gateCommandProducer).send(captor.capture());
        GateCommand command = captor.getValue();

        assertThat(command.commandId()).isNotNull();
        assertThat(command.reservationId()).isEqualTo(reservationId);
        assertThat(command.issuedAt()).isNotNull();
    }

    @Test
    @DisplayName("settleReservationOnExit is called on valid exit flow")
    void exitFlow_callsSettleReservationOnExit() {
        PaymentRecord record = new PaymentRecord();
        record.setReservationId(reservationId);
        record.setStatus(PaymentStatus.COMPLETED);

        when(vehicleRepository.findByPlate("AB-12-CD")).thenReturn(Optional.of(vehicle));
        when(reservationRepository.findActiveByVehicleIdAndParkId(eq(vehicleId), eq(parkId), any(OffsetDateTime.class)))
            .thenReturn(List.of(reservation));
        when(paymentRecordRepository.findFirstByReservationIdAndStatusInOrderByCreatedAtDesc(eq(reservationId), any(Collection.class)))
            .thenReturn(Optional.of(record));

        orchestrator.onExitOcrEvent(exitEvent);

        verify(billingService).settleReservationOnExit(eq(reservation), any(OffsetDateTime.class), any());
    }

    private OcrPlateEvent buildOcrExitEvent(UUID parkId, String plate, double confidence) {
        OcrPlateEvent.OcrPayload payload = new OcrPlateEvent.OcrPayload(
            plate, confidence, "exit", "Park Test", "A1", "STANDARD",
            1, 1, null, null
        );
        return new OcrPlateEvent(UUID.randomUUID(), "ocr.plate.read", parkId, null, Instant.now(), payload, 1);
    }
}
