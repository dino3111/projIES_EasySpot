package pt.ua.deti.apieasyspot.billing.service;

import com.stripe.exception.StripeException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import pt.ua.deti.apieasyspot.billing.dto.CheckoutSessionRequest;
import pt.ua.deti.apieasyspot.billing.model.PaymentRecord;
import pt.ua.deti.apieasyspot.billing.model.PaymentStatus;
import pt.ua.deti.apieasyspot.billing.repository.PaymentRecordRepository;
import pt.ua.deti.apieasyspot.billing.repository.StripeEventRepository;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
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

    @InjectMocks
    private StripeService stripeService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(stripeService, "stripeApiKey", "sk_test_123");
        ReflectionTestUtils.setField(stripeService, "endpointSecret", "whsec_123");
    }

    @Test
    void testGetPaymentStatus_Success() {
        UUID reservationId = UUID.randomUUID();
        PaymentRecord record = PaymentRecord.builder()
                .reservationId(reservationId)
                .status(PaymentStatus.COMPLETED)
                .amount(new BigDecimal("10.00"))
                .currency("EUR")
                .paymentIntentId("pi_123")
                .build();

        when(paymentRecordRepository.findByReservationId(reservationId)).thenReturn(Optional.of(record));

        var response = stripeService.getPaymentStatus(reservationId);

        assertEquals(reservationId, response.reservationId());
        assertEquals(PaymentStatus.COMPLETED, response.status());
        assertEquals(new BigDecimal("10.00"), response.amount());
    }

    @Test
    void testGetPaymentStatus_NotFound() {
        UUID reservationId = UUID.randomUUID();
        when(paymentRecordRepository.findByReservationId(reservationId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> stripeService.getPaymentStatus(reservationId));
    }
}
