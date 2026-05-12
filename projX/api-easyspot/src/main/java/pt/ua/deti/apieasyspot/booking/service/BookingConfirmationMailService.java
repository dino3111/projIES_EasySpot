package pt.ua.deti.apieasyspot.booking.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import pt.ua.deti.apieasyspot.billing.model.PaymentRecord;
import pt.ua.deti.apieasyspot.billing.model.PaymentStatus;
import pt.ua.deti.apieasyspot.billing.repository.PaymentRecordRepository;
import pt.ua.deti.apieasyspot.booking.model.Reservation;
import pt.ua.deti.apieasyspot.notification.service.EmailDeliveryDedupService;
import pt.ua.deti.apieasyspot.vehicle.model.Vehicle;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingConfirmationMailService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final EmailDeliveryDedupService emailDeliveryDedupService;
    private final PaymentRecordRepository paymentRecordRepository;

    @Async
    public void sendConfirmation(Reservation reservation) {
        send(reservation,
            "booking-confirmation:" + reservation.getId(),
            "BOOKING_CONFIRMATION",
            "EasySpot — Reserva confirmada " + reservation.getBookingCode(),
            buildConfirmationBody(reservation));
    }

    @Async
    public void sendUpdate(Reservation reservation, BigDecimal previousCost, BigDecimal newCost, BigDecimal delta) {
        send(reservation,
            "booking-update:" + reservation.getId() + ":" + reservation.getArrivalTime() + ":" + reservation.getEstimatedCost(),
            "BOOKING_UPDATE",
            "EasySpot — Reserva atualizada " + reservation.getBookingCode(),
            buildUpdateBody(reservation, previousCost, newCost, delta));
    }

    @Async
    public void sendCancellation(Reservation reservation, BigDecimal refundedAmount, boolean refundSucceeded) {
        send(reservation,
            "booking-cancellation:" + reservation.getId(),
            "BOOKING_CANCELLATION",
            "EasySpot — Reserva cancelada " + reservation.getBookingCode(),
            buildCancellationBody(reservation, refundedAmount, refundSucceeded));
    }

    private void send(Reservation reservation, String deliveryKey, String category, String subject, String body) {
        String email = reservation.getUser() != null ? reservation.getUser().getEmail() : null;
        if (email == null || email.isBlank()) {
            log.warn("Cannot send {}: user has no email (reservation {})", category, reservation.getBookingCode());
            return;
        }
        try {
            boolean sent = emailDeliveryDedupService.sendOnce(deliveryKey, category, email, subject, body);
            if (!sent) {
                log.debug("Skipping duplicate {} email for reservation {}", category, reservation.getBookingCode());
                return;
            }
            log.info("{} email sent to {} for reservation {}", category, email, reservation.getBookingCode());
        } catch (Exception ex) {
            log.warn("Failed to send {} email for {}: {}", category, reservation.getBookingCode(), ex.getMessage());
        }
    }

    private String buildConfirmationBody(Reservation reservation) {
        return """
            A sua reserva foi confirmada com sucesso!

            %s

            A reserva é válida por 30 minutos após a hora marcada.
            Se não comparecer dentro desse período, o lugar será libertado.

            Boas viagens,
            Equipa EasySpot
            """.formatted(commonDetails(reservation));
    }

    private String buildUpdateBody(Reservation reservation, BigDecimal previousCost, BigDecimal newCost, BigDecimal delta) {
        BigDecimal prev = previousCost != null ? previousCost : BigDecimal.ZERO;
        BigDecimal next = newCost != null ? newCost : BigDecimal.ZERO;
        BigDecimal d    = delta != null ? delta : next.subtract(prev);

        String paymentLine;
        if (d.signum() > 0) {
            paymentLine = "Foi cobrada a diferença de €%.2f no seu método de pagamento Stripe.".formatted(d);
        } else if (d.signum() < 0) {
            paymentLine = "Foi reembolsada a diferença de €%.2f no seu método de pagamento Stripe.".formatted(d.abs());
        } else {
            paymentLine = "Não houve alteração no valor da reserva.";
        }

        return """
            A sua reserva foi atualizada.

            %s

            Valor anterior   : €%.2f
            Novo valor       : €%.2f
            %s

            Equipa EasySpot
            """.formatted(commonDetails(reservation), prev, next, paymentLine);
    }

    private String buildCancellationBody(Reservation reservation, BigDecimal refundedAmount, boolean refundSucceeded) {
        BigDecimal amount = refundedAmount != null ? refundedAmount.abs() : BigDecimal.ZERO;
        String refundLine;
        if (amount.signum() <= 0) {
            refundLine = "Não havia valor cobrado a reembolsar.";
        } else if (refundSucceeded) {
            refundLine = "Foram reembolsados €%.2f no seu método de pagamento Stripe.".formatted(amount);
        } else {
            refundLine = ("O reembolso de €%.2f não pôde ser processado automaticamente."
                + " A nossa equipa irá tratar do reembolso manualmente.").formatted(amount);
        }

        return """
            A sua reserva foi cancelada.

            Código de reserva : %s
            Parque            : %s
            Chegada prevista  : %s
            Saída prevista    : %s

            %s

            Equipa EasySpot
            """.formatted(
            reservation.getBookingCode(),
            reservation.getParkingLot().getName(),
            FMT.format(reservation.getArrivalTime()),
            FMT.format(reservation.getDepartureTime()),
            refundLine
        );
    }

    private String commonDetails(Reservation reservation) {
        String spot = reservation.getParkingSpot() != null
            ? "Lugar " + reservation.getParkingSpot().getSpotNumber()
            : "A atribuir no momento de chegada";
        BigDecimal cost = reservation.getEstimatedCost() != null ? reservation.getEstimatedCost() : BigDecimal.ZERO;

        return """
            Código de reserva : %s
            Parque            : %s
            Morada            : %s
            Lugar             : %s
            Chegada prevista  : %s
            Saída prevista    : %s
            Custo estimado    : €%.2f

            %s

            %s""".formatted(
            reservation.getBookingCode(),
            reservation.getParkingLot().getName(),
            reservation.getParkingLot().getAddress(),
            spot,
            FMT.format(reservation.getArrivalTime()),
            FMT.format(reservation.getDepartureTime()),
            cost,
            vehicleBlock(reservation.getVehicle()),
            paymentBlock(reservation)
        );
    }

    private String vehicleBlock(Vehicle vehicle) {
        if (vehicle == null) {
            return "Veículo           : (não associado)";
        }
        StringBuilder sb = new StringBuilder("Veículo           : ");
        sb.append(vehicle.getPlate() != null ? vehicle.getPlate() : "—");
        if (vehicle.getMake() != null || vehicle.getModel() != null) {
            sb.append(" — ");
            if (vehicle.getMake() != null) sb.append(vehicle.getMake()).append(' ');
            if (vehicle.getModel() != null) sb.append(vehicle.getModel());
        }
        if (vehicle.isEv()) sb.append(" (EV)");
        return sb.toString().trim();
    }

    private String paymentBlock(Reservation reservation) {
        Optional<PaymentRecord> latest = paymentRecordRepository
            .findTopByReservationIdOrderByCreatedAtDesc(reservation.getId());
        if (latest.isEmpty()) {
            return "Pagamento         : a confirmar";
        }
        PaymentRecord record = latest.get();
        String status = paymentStatusLabel(record.getStatus());
        String amount = record.getAmount() != null ? "€%.2f".formatted(record.getAmount()) : "—";
        String reference = record.getPaymentIntentId() != null
            ? " · referência Stripe: " + record.getPaymentIntentId()
            : "";
        return "Pagamento         : %s · %s%s".formatted(amount, status, reference);
    }

    private String paymentStatusLabel(PaymentStatus status) {
        if (status == null) return "estado desconhecido";
        return switch (status) {
            case COMPLETED -> "pago";
            case PENDING -> "pendente";
            case FAILED -> "falhou";
            case REFUNDED -> "reembolsado";
            case PARTIALLY_REFUNDED -> "parcialmente reembolsado";
        };
    }
}
