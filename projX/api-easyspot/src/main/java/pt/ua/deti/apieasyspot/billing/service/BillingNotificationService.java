package pt.ua.deti.apieasyspot.billing.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import pt.ua.deti.apieasyspot.billing.model.PaymentRecord;
import pt.ua.deti.apieasyspot.notification.service.EmailDeliveryDedupService;

@Slf4j
@Service
@RequiredArgsConstructor
public class BillingNotificationService {

    private final SimpMessagingTemplate messagingTemplate;
    private final EmailDeliveryDedupService emailDeliveryDedupService;

    public void notifyPaymentSuccess(PaymentRecord payment) {
        // WebSocket notification
        String destination = "/topic/payments/" + payment.getReservationId();
        messagingTemplate.convertAndSend(destination, "Payment successful for reservation: " + payment.getReservationId());

        // Email notification
        if (payment.getCustomerEmail() != null) {
            try {
                boolean sent = emailDeliveryDedupService.sendOnce(
                    "payment-confirmation:" + payment.getReservationId(),
                    "PAYMENT_CONFIRMATION",
                    payment.getCustomerEmail(),
                    "EasySpot - Payment Confirmation",
                    "Your payment of " + payment.getAmount() + " " + payment.getCurrency() +
                        " for reservation " + payment.getReservationId() + " was successful."
                );
                if (!sent) {
                    log.debug("Skipping duplicate payment confirmation email for reservation {}", payment.getReservationId());
                }
            } catch (Exception e) {
                log.error("Failed to send payment confirmation email", e);
            }
        }
    }
    
    public void notifyPaymentFailure(PaymentRecord payment) {
        String destination = "/topic/payments/" + payment.getReservationId();
        messagingTemplate.convertAndSend(destination, "Payment failed for reservation: " + payment.getReservationId());
    }
}
