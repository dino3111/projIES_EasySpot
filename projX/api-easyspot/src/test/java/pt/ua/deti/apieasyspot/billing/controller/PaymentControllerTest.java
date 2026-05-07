package pt.ua.deti.apieasyspot.billing.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;
import pt.ua.deti.apieasyspot.billing.dto.PaymentMethodSummaryResponse;
import pt.ua.deti.apieasyspot.billing.dto.PaymentSetupStatusResponse;
import pt.ua.deti.apieasyspot.billing.service.StripeService;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentControllerTest {

    @Mock private StripeService stripeService;
    @Mock private Jwt jwt;

    @InjectMocks
    private PaymentController paymentController;

    @BeforeEach
    void setUp() {
        when(jwt.getSubject()).thenReturn("sub-123");
        when(jwt.getClaimAsString("email")).thenReturn("user@test.com");
    }

    @Test
    @DisplayName("getPaymentSetupStatus - calls service and returns 200")
    void getPaymentSetupStatus_success() throws Exception {
        PaymentSetupStatusResponse statusResponse = new PaymentSetupStatusResponse(true);
        when(stripeService.getPaymentSetupStatus("sub-123", "user@test.com")).thenReturn(statusResponse);

        ResponseEntity<PaymentSetupStatusResponse> response = paymentController.getPaymentSetupStatus(jwt);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(statusResponse);
        verify(stripeService).getPaymentSetupStatus("sub-123", "user@test.com");
    }

    @Test
    @DisplayName("listPaymentMethods - calls service and returns 200 with list")
    void listPaymentMethods_success() throws Exception {
        PaymentMethodSummaryResponse method = new PaymentMethodSummaryResponse(
            "pm_123", "card", "visa", "4242", 12L, 2026L, true
        );
        when(stripeService.listPaymentMethods("sub-123", "user@test.com")).thenReturn(List.of(method));

        ResponseEntity<List<PaymentMethodSummaryResponse>> response = paymentController.listPaymentMethods(jwt);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsExactly(method);
        verify(stripeService).listPaymentMethods("sub-123", "user@test.com");
    }

    @Test
    @DisplayName("detachPaymentMethod - calls service and returns 204")
    void detachPaymentMethod_success() throws Exception {
        ResponseEntity<Void> response = paymentController.detachPaymentMethod(jwt, "pm_123");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(stripeService).detachPaymentMethod("sub-123", "user@test.com", "pm_123");
    }
}
