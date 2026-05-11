package pt.ua.deti.apieasyspot.notification.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import pt.ua.deti.apieasyspot.notification.model.NotificationEmailDelivery;
import pt.ua.deti.apieasyspot.notification.model.NotificationEmailDeliveryStatus;
import pt.ua.deti.apieasyspot.notification.repository.NotificationEmailDeliveryRepository;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailDeliveryDedupService {

    private final NotificationEmailDeliveryRepository deliveryRepository;
    private final JavaMailSender mailSender;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean sendOnce(String deliveryKey, String category, String recipient, String subject, String body) {
        NotificationEmailDelivery delivery = deliveryRepository.findByDeliveryKey(deliveryKey)
            .orElseGet(() -> new NotificationEmailDelivery());

        if (delivery.getId() != null && delivery.getStatus() == NotificationEmailDeliveryStatus.SENT) {
            log.debug("Skipping duplicate email delivery {} (already sent)", deliveryKey);
            return false;
        }

        if (delivery.getId() != null && delivery.getStatus() == NotificationEmailDeliveryStatus.PENDING) {
            log.debug("Skipping duplicate email delivery {} (already pending)", deliveryKey);
            return false;
        }

        delivery.setDeliveryKey(deliveryKey);
        delivery.setCategory(category);
        delivery.setRecipient(recipient);
        delivery.setSubject(subject);
        delivery.setStatus(NotificationEmailDeliveryStatus.PENDING);
        delivery.setErrorMessage(null);
        delivery.setSentAt(null);

        try {
            deliveryRepository.saveAndFlush(delivery);
        } catch (DataIntegrityViolationException ex) {
            log.debug("Skipping duplicate email delivery {} after uniqueness check", deliveryKey);
            return false;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(recipient);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);

            delivery.setStatus(NotificationEmailDeliveryStatus.SENT);
            delivery.setSentAt(OffsetDateTime.now(ZoneOffset.UTC));
            deliveryRepository.save(delivery);
            return true;
        } catch (Exception ex) {
            delivery.setStatus(NotificationEmailDeliveryStatus.FAILED);
            delivery.setErrorMessage(truncate(ex.getMessage()));
            deliveryRepository.save(delivery);
            log.warn("Failed to send email delivery {}: {}", deliveryKey, ex.getMessage());
            return false;
        }
    }

    private String truncate(String value) {
        if (value == null) return null;
        return value.length() <= 1000 ? value : value.substring(0, 1000);
    }
}
