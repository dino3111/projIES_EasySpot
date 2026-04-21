package pt.ua.deti.apieasyspot.billing.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import pt.ua.deti.apieasyspot.billing.model.PaymentRecord;

@Slf4j
@Service
@RequiredArgsConstructor
public class BillingNotificationService {

    private final SimpMessagingTemplate messagingTemplate;
    private final JavaMailSender mailSender;

    public void notifyPaymentSuccess(PaymentRecord payment) {
        // WebSocket notification
        String destination = "/topic/payments/" + payment.getReservationId();
        messagingTemplate.convertAndSend(destination, "Payment successful for reservation: " + payment.getReservationId());

        // Email notification
        if (payment.getCustomerEmail() != null) {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setTo(payment.getCustomerEmail());
                message.setSubject("EasySpot - Payment Confirmation");
                message.setText("Your payment of " + payment.getAmount() + " " + payment.getCurrency() + 
                                " for reservation " + payment.getReservationId() + " was successful.");
                mailSender.send(message);
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
