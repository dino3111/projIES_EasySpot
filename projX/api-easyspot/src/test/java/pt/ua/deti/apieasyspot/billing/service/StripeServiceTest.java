package pt.ua.deti.apieasyspot.billing.service;

import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.PaymentIntent;
import com.stripe.net.Webhook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.billing.dto.RefundRequest;
import pt.ua.deti.apieasyspot.billing.model.PaymentRecord;
import pt.ua.deti.apieasyspot.billing.model.PaymentStatus;
import pt.ua.deti.apieasyspot.billing.repository.PaymentRecordRepository;
import pt.ua.deti.apieasyspot.billing.repository.StripeEventRepository;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;
import pt.ua.deti.apieasyspot.common.exception.UnprocessableEntityException;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StripeServiceTest {

    @Mock
    private PaymentRecordRepository paymentRecordRepository;

    @Mock
    private StripeEventRepository stripeEventRepository;

    @Mock
    private BillingNotificationService notificationService;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private StripeService stripeService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(stripeService, "stripeApiKey", "sk_test_123");
        ReflectionTestUtils.setField(stripeService, "endpointSecret", "whsec_123");
        ReflectionTestUtils.setField(stripeService, "frontendUrl", "http://localhost:5173");
    }

    @Test
    @DisplayName("getPaymentStatus returns response when record found")
    void getPaymentStatus_found_returnsResponse() {
        UUID reservationId = UUID.randomUUID();
        PaymentRecord paymentRecord = PaymentRecord.builder()
            .reservationId(reservationId)
            .status(PaymentStatus.COMPLETED)
            .amount(new BigDecimal("10.00"))
            .currency("eur")
            .paymentIntentId("pi_123")
            .build();

        when(paymentRecordRepository.findTopByReservationIdOrderByCreatedAtDesc(reservationId))
            .thenReturn(Optional.of(paymentRecord));

        pt.ua.deti.apieasyspot.billing.dto.PaymentStatusResponse response = stripeService.getPaymentStatus(reservationId);

        assertThat(response.reservationId()).isEqualTo(reservationId);
        assertThat(response.status()).isEqualTo(PaymentStatus.COMPLETED);
        assertThat(response.amount()).isEqualByComparingTo("10.00");
        assertThat(response.paymentIntentId()).isEqualTo("pi_123");
    }

    @Test
    @DisplayName("getPaymentStatus throws ResourceNotFoundException when no record")
    void getPaymentStatus_notFound_throwsResourceNotFoundException() {
        UUID reservationId = UUID.randomUUID();
        when(paymentRecordRepository.findTopByReservationIdOrderByCreatedAtDesc(reservationId))
            .thenReturn(Optional.empty());

        assertThatThrownBy(() -> stripeService.getPaymentStatus(reservationId))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("refundPayment throws ResourceNotFoundException when no record")
    void refundPayment_notFound_throwsResourceNotFoundException() {
        UUID reservationId = UUID.randomUUID();
        when(paymentRecordRepository.findTopByReservationIdOrderByCreatedAtDesc(reservationId))
            .thenReturn(Optional.empty());

        RefundRequest request = new RefundRequest(reservationId, null, null);
        assertThatThrownBy(() -> stripeService.refundPayment(request))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("refundPayment throws UnprocessableEntityException when status is not COMPLETED")
    void refundPayment_notCompleted_throwsUnprocessableEntity() {
        UUID reservationId = UUID.randomUUID();
        PaymentRecord paymentRecord = PaymentRecord.builder()
            .reservationId(reservationId)
            .status(PaymentStatus.PENDING)
            .paymentIntentId("pi_123")
            .build();

        when(paymentRecordRepository.findTopByReservationIdOrderByCreatedAtDesc(reservationId))
            .thenReturn(Optional.of(paymentRecord));

        RefundRequest request = new RefundRequest(reservationId, null, null);
        assertThatThrownBy(() -> stripeService.refundPayment(request))
            .isInstanceOf(UnprocessableEntityException.class)
            .hasMessageContaining("PENDING");
    }

    @Test
    @DisplayName("refundPayment throws UnprocessableEntityException when status is FAILED")
    void refundPayment_failed_throwsUnprocessableEntity() {
        UUID reservationId = UUID.randomUUID();
        PaymentRecord paymentRecord = PaymentRecord.builder()
            .reservationId(reservationId)
            .status(PaymentStatus.FAILED)
            .paymentIntentId("pi_123")
            .build();

        when(paymentRecordRepository.findTopByReservationIdOrderByCreatedAtDesc(reservationId))
            .thenReturn(Optional.of(paymentRecord));

        RefundRequest request = new RefundRequest(reservationId, null, null);
        assertThatThrownBy(() -> stripeService.refundPayment(request))
            .isInstanceOf(UnprocessableEntityException.class);
    }

    @Test
    @DisplayName("createSetupIntent throws IllegalStateException when Stripe key is not configured")
    void createSetupIntent_withoutStripeKey_throwsIllegalStateException() {
        ReflectionTestUtils.setField(stripeService, "stripeApiKey", "");

        assertThatThrownBy(() -> stripeService.createSetupIntent("sub-123", "user@example.com"))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("Stripe is not configured");
    }

    @Test
    @DisplayName("createCustomerPortalSession resolves email from local user when token email is missing")
    void createCustomerPortalSession_usesStoredEmailWhenTokenEmailMissing() {
        User user = new User();
        user.setEmail("stored@example.com");

        when(userRepository.findByAuthentikUserId("sub-123")).thenReturn(Optional.of(user));

        String resolvedEmail = ReflectionTestUtils.invokeMethod(
            stripeService, "resolveCustomerEmail", "sub-123", null);

        assertThat(resolvedEmail).isEqualTo("stored@example.com");
    }

    @Test
    @DisplayName("handleWebhook skips already-processed event (idempotency)")
    void handleWebhook_alreadyProcessed_skips() throws Exception {
        Event event = mock(Event.class);
        when(event.getId()).thenReturn("evt_already_done");
        when(stripeEventRepository.existsById("evt_already_done")).thenReturn(true);

        try (MockedStatic<Webhook> webhookMock = mockStatic(Webhook.class)) {
            webhookMock.when(() -> Webhook.constructEvent(any(), any(), any())).thenReturn(event);

            stripeService.handleWebhook("{}", "t=1,v1=sig");

            verify(paymentRecordRepository, never()).save(any());
            verify(stripeEventRepository, never()).save(any());
        }
    }

    @Test
    @DisplayName("handleWebhook processes payment_intent.succeeded and marks COMPLETED")
    void handleWebhook_paymentIntentSucceeded_marksCompleted() throws Exception {
        UUID reservationId = UUID.randomUUID();
        PaymentRecord paymentRecord = PaymentRecord.builder()
            .reservationId(reservationId)
            .status(PaymentStatus.PENDING)
            .stripeSessionId("cs_test")
            .amount(new BigDecimal("15.00"))
            .currency("eur")
            .build();

        PaymentIntent pi = mock(PaymentIntent.class);
        when(pi.getId()).thenReturn("pi_test_123");
        when(pi.getMetadata()).thenReturn(java.util.Map.of("reservationId", reservationId.toString()));

        EventDataObjectDeserializer deserializer = mock(EventDataObjectDeserializer.class);
        when(deserializer.getObject()).thenReturn(Optional.of(pi));

        Event event = mock(Event.class);
        when(event.getId()).thenReturn("evt_pi_succeeded");
        when(event.getType()).thenReturn("payment_intent.succeeded");
        when(event.getDataObjectDeserializer()).thenReturn(deserializer);

        when(stripeEventRepository.existsById("evt_pi_succeeded")).thenReturn(false);
        when(paymentRecordRepository.findByPaymentIntentId("pi_test_123")).thenReturn(Optional.empty());
        when(paymentRecordRepository.findTopByReservationIdOrderByCreatedAtDesc(reservationId))
            .thenReturn(Optional.of(paymentRecord));
        when(paymentRecordRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        try (MockedStatic<Webhook> webhookMock = mockStatic(Webhook.class)) {
            webhookMock.when(() -> Webhook.constructEvent(any(), any(), any())).thenReturn(event);

            stripeService.handleWebhook("{}", "t=1,v1=sig");
        }

        assertThat(paymentRecord.getStatus()).isEqualTo(PaymentStatus.COMPLETED);
        assertThat(paymentRecord.getPaymentIntentId()).isEqualTo("pi_test_123");
        verify(notificationService).notifyPaymentSuccess(paymentRecord);
        verify(stripeEventRepository).save(any());
    }

    @Test
    @DisplayName("handleWebhook processes payment_intent.payment_failed and marks FAILED")
    void handleWebhook_paymentIntentFailed_marksFailed() throws Exception {
        UUID reservationId = UUID.randomUUID();
        PaymentRecord paymentRecord = PaymentRecord.builder()
            .reservationId(reservationId)
            .status(PaymentStatus.PENDING)
            .paymentIntentId("pi_failed_123")
            .build();

        PaymentIntent pi = mock(PaymentIntent.class);
        when(pi.getId()).thenReturn("pi_failed_123");

        EventDataObjectDeserializer deserializer = mock(EventDataObjectDeserializer.class);
        when(deserializer.getObject()).thenReturn(Optional.of(pi));

        Event event = mock(Event.class);
        when(event.getId()).thenReturn("evt_pi_failed");
        when(event.getType()).thenReturn("payment_intent.payment_failed");
        when(event.getDataObjectDeserializer()).thenReturn(deserializer);

        when(stripeEventRepository.existsById("evt_pi_failed")).thenReturn(false);
        when(paymentRecordRepository.findByPaymentIntentId("pi_failed_123")).thenReturn(Optional.of(paymentRecord));
        when(paymentRecordRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        try (MockedStatic<Webhook> webhookMock = mockStatic(Webhook.class)) {
            webhookMock.when(() -> Webhook.constructEvent(any(), any(), any())).thenReturn(event);

            stripeService.handleWebhook("{}", "t=1,v1=sig");
        }

        assertThat(paymentRecord.getStatus()).isEqualTo(PaymentStatus.FAILED);
        verify(notificationService).notifyPaymentFailure(paymentRecord);
    }
}
