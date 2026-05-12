package pt.ua.deti.apieasyspot.notification.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import pt.ua.deti.apieasyspot.notification.model.NotificationEmailDelivery;
import pt.ua.deti.apieasyspot.notification.model.NotificationEmailDeliveryStatus;
import pt.ua.deti.apieasyspot.notification.repository.NotificationEmailDeliveryRepository;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmailDeliveryDedupServiceTest {

    @Mock
    private NotificationEmailDeliveryRepository deliveryRepository;

    @Mock
    private JavaMailSender mailSender;

    @InjectMocks
    private EmailDeliveryDedupService dedupService;

    @Test
    void sendOnce_sendsNewEmailAndMarksItAsSent() {
        when(deliveryRepository.findByDeliveryKey("booking-confirmation:1")).thenReturn(Optional.empty());
        when(deliveryRepository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(deliveryRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        boolean sent = dedupService.sendOnce(
            "booking-confirmation:1",
            "BOOKING_CONFIRMATION",
            "driver@example.com",
            "Reserva confirmada",
            "Corpo"
        );

        assertThat(sent).isTrue();
        ArgumentCaptor<NotificationEmailDelivery> captor = ArgumentCaptor.forClass(NotificationEmailDelivery.class);
        verify(deliveryRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(NotificationEmailDeliveryStatus.SENT);
        verify(mailSender).send(any(SimpleMailMessage.class));
    }

    @Test
    void sendOnce_skipsAlreadySentEmail() {
        NotificationEmailDelivery existing = new NotificationEmailDelivery();
        existing.setId(UUID.randomUUID());
        existing.setStatus(NotificationEmailDeliveryStatus.SENT);
        when(deliveryRepository.findByDeliveryKey("booking-confirmation:1")).thenReturn(Optional.of(existing));

        boolean sent = dedupService.sendOnce(
            "booking-confirmation:1",
            "BOOKING_CONFIRMATION",
            "driver@example.com",
            "Reserva confirmada",
            "Corpo"
        );

        assertThat(sent).isFalse();
        verify(mailSender, never()).send(any(SimpleMailMessage.class));
    }
}
