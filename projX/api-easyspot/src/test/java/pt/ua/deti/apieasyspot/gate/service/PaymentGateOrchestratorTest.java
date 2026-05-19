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

        exitEvent = buildOcrExitEvent(parkId, "AB-12-CD", 0.95);
    }

    @Test
    @DisplayName("Payment COMPLETED -> OPEN_GATE command issued for exit gate")
    void approvedPayment_opensExitGate() {
        PaymentRecord record = new PaymentRecord();
        record.setReservationId(reservationId);
        record.setStatus(PaymentStatus.COMPLETED);

        when(vehicleRepository.findByPlate("AB-12-CD")).thenReturn(Optional.of(vehicle));
        when(reservationRepository.findActiveByVehicleIdAndParkId(vehicleId, parkId))
            .thenReturn(List.of(reservation));
        when(paymentRecordRepository.findTopByReservationIdOrderByCreatedAtDesc(reservationId))
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
    @DisplayName("Payment PENDING -> BLOCK_GATE command issued for exit gate")
    void pendingPayment_blocksExitGate() {
        PaymentRecord record = new PaymentRecord();
        record.setReservationId(reservationId);
        record.setStatus(PaymentStatus.PENDING);

        when(vehicleRepository.findByPlate("AB-12-CD")).thenReturn(Optional.of(vehicle));
        when(reservationRepository.findActiveByVehicleIdAndParkId(vehicleId, parkId))
            .thenReturn(List.of(reservation));
        when(paymentRecordRepository.findTopByReservationIdOrderByCreatedAtDesc(reservationId))
            .thenReturn(Optional.of(record));

        orchestrator.onExitOcrEvent(exitEvent);

        ArgumentCaptor<GateCommand> captor = ArgumentCaptor.forClass(GateCommand.class);
        verify(gateCommandProducer).send(captor.capture());
        GateCommand command = captor.getValue();

        assertThat(command.commandType()).isEqualTo("BLOCK_GATE");
        assertThat(command.direction()).isEqualTo("exit");
        assertThat(command.reason()).contains("pending");
    }

    @Test
    @DisplayName("Payment FAILED -> BLOCK_GATE command issued for exit gate")
    void failedPayment_blocksExitGate() {
        PaymentRecord record = new PaymentRecord();
        record.setReservationId(reservationId);
        record.setStatus(PaymentStatus.FAILED);

        when(vehicleRepository.findByPlate("AB-12-CD")).thenReturn(Optional.of(vehicle));
        when(reservationRepository.findActiveByVehicleIdAndParkId(vehicleId, parkId))
            .thenReturn(List.of(reservation));
        when(paymentRecordRepository.findTopByReservationIdOrderByCreatedAtDesc(reservationId))
            .thenReturn(Optional.of(record));

        orchestrator.onExitOcrEvent(exitEvent);

        ArgumentCaptor<GateCommand> captor = ArgumentCaptor.forClass(GateCommand.class);
        verify(gateCommandProducer).send(captor.capture());
        assertThat(captor.getValue().commandType()).isEqualTo("BLOCK_GATE");
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
    @DisplayName("No active reservation -> BLOCK_GATE with reason no_active_reservation")
    void noActiveReservation_blocksGate() {
        when(vehicleRepository.findByPlate("AB-12-CD")).thenReturn(Optional.of(vehicle));
        when(reservationRepository.findActiveByVehicleIdAndParkId(vehicleId, parkId))
            .thenReturn(List.of());

        orchestrator.onExitOcrEvent(exitEvent);

        ArgumentCaptor<GateCommand> captor = ArgumentCaptor.forClass(GateCommand.class);
        verify(gateCommandProducer).send(captor.capture());
        assertThat(captor.getValue().commandType()).isEqualTo("BLOCK_GATE");
        assertThat(captor.getValue().reason()).isEqualTo("no_active_reservation");
    }

    @Test
    @DisplayName("No payment record -> BLOCK_GATE with reason no_payment_record")
    void noPaymentRecord_blocksGate() {
        when(vehicleRepository.findByPlate("AB-12-CD")).thenReturn(Optional.of(vehicle));
        when(reservationRepository.findActiveByVehicleIdAndParkId(vehicleId, parkId))
            .thenReturn(List.of(reservation));
        when(paymentRecordRepository.findTopByReservationIdOrderByCreatedAtDesc(reservationId))
            .thenReturn(Optional.empty());

        orchestrator.onExitOcrEvent(exitEvent);

        ArgumentCaptor<GateCommand> captor = ArgumentCaptor.forClass(GateCommand.class);
        verify(gateCommandProducer).send(captor.capture());
        assertThat(captor.getValue().commandType()).isEqualTo("BLOCK_GATE");
        assertThat(captor.getValue().reason()).isEqualTo("no_payment_record");
    }

    @Test
    @DisplayName("Entry OCR event is ignored by orchestrator")
    void entryOcrEvent_isNotTriggeredByOrchestrator() {
        // Entry events are filtered before orchestrator.onExitOcrEvent() is called —
        // this test verifies the orchestrator itself does nothing if called with null payload.
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
        when(reservationRepository.findActiveByVehicleIdAndParkId(vehicleId, parkId))
            .thenReturn(List.of(reservation));
        when(paymentRecordRepository.findTopByReservationIdOrderByCreatedAtDesc(reservationId))
            .thenReturn(Optional.of(record));

        orchestrator.onExitOcrEvent(exitEvent);

        ArgumentCaptor<GateCommand> captor = ArgumentCaptor.forClass(GateCommand.class);
        verify(gateCommandProducer).send(captor.capture());
        GateCommand command = captor.getValue();

        assertThat(command.commandId()).isNotNull();
        assertThat(command.reservationId()).isEqualTo(reservationId);
        assertThat(command.issuedAt()).isNotNull();
    }

    private OcrPlateEvent buildOcrExitEvent(UUID parkId, String plate, double confidence) {
        OcrPlateEvent.OcrPayload payload = new OcrPlateEvent.OcrPayload(
            plate, confidence, "exit", "Park Test", "A1", "STANDARD",
            1, 1, null
        );
        return new OcrPlateEvent(UUID.randomUUID(), "ocr.plate.read", parkId, null, Instant.now(), payload, 1);
    }
}
