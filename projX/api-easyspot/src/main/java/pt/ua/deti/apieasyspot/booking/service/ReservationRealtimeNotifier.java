package pt.ua.deti.apieasyspot.booking.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import pt.ua.deti.apieasyspot.booking.model.Reservation;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Pushes reservation lifecycle events (update, cancel) directly to the owning driver's
 * WebSocket destination so the UI can react in real time without going through the
 * subscription-based alert flow.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReservationRealtimeNotifier {

    private final SimpMessagingTemplate messagingTemplate;

    public void notifyCreated(Reservation reservation) {
        push(reservation, "RESERVATION_CREATED",
            "Reserva " + reservation.getBookingCode() + " confirmada");
    }

    public void notifyUpdated(Reservation reservation, java.math.BigDecimal costDelta, String adjustmentKind, String paymentStatus) {
        String detail;
        if ("CHARGED".equals(adjustmentKind) && costDelta != null && costDelta.signum() > 0) {
            detail = " · cobrados +€%.2f".formatted(costDelta);
        } else if ("REFUNDED".equals(adjustmentKind) && costDelta != null && costDelta.signum() < 0) {
            detail = " · reembolsados €%.2f".formatted(costDelta.abs());
        } else if ("CHARGE_PENDING".equals(adjustmentKind)) {
            detail = " · cobrança pendente";
        } else if ("REFUND_PENDING".equals(adjustmentKind)) {
            detail = " · reembolso pendente";
        } else if ("CHARGE_FAILED".equals(adjustmentKind)) {
            detail = " · cobrança falhou";
        } else if ("REFUND_FAILED".equals(adjustmentKind)) {
            detail = " · reembolso falhou";
        } else {
            detail = "";
        }
        push(reservation, "RESERVATION_UPDATED",
            "Reserva " + reservation.getBookingCode() + " atualizada" + detail);
    }

    public void notifyCancelled(Reservation reservation, java.math.BigDecimal refundedAmount, boolean refundSucceeded) {
        String detail;
        if (refundedAmount != null && refundedAmount.signum() > 0) {
            detail = refundSucceeded
                ? " · reembolsados €%.2f".formatted(refundedAmount)
                : " · reembolso pendente";
        } else {
            detail = "";
        }
        push(reservation, "RESERVATION_CANCELLED",
            "Reserva " + reservation.getBookingCode() + " cancelada" + detail);
    }

    private void push(Reservation reservation, String alertType, String message) {
        if (reservation.getUser() == null || reservation.getUser().getAuthentikUserId() == null) {
            log.debug("Skipping {} push: reservation {} has no authentik user", alertType, reservation.getBookingCode());
            return;
        }
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("alertType", alertType);
            payload.put("parkId", reservation.getParkingLot().getId().toString());
            payload.put("bookingCode", reservation.getBookingCode());
            payload.put("reservationId", reservation.getId().toString());
            payload.put("message", message);
            payload.put("occurredAt", Instant.now().toString());
            payload.put("source", "reservation-service");

            String destination = "/topic/alerts/" + reservation.getUser().getAuthentikUserId();
            messagingTemplate.convertAndSend(destination, (Object) payload);
        } catch (Exception ex) {
            log.warn("Failed to push realtime {} for reservation {}: {}",
                alertType, reservation.getBookingCode(), ex.getMessage());
        }
    }
}
