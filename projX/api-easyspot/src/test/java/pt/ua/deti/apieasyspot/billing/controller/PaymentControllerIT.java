package pt.ua.deti.apieasyspot.billing.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import pt.ua.deti.apieasyspot.billing.dto.CheckoutSessionRequest;
import pt.ua.deti.apieasyspot.billing.dto.CheckoutSessionResponse;
import pt.ua.deti.apieasyspot.billing.dto.PaymentMethodSummaryResponse;
import pt.ua.deti.apieasyspot.billing.dto.PaymentSetupStatusResponse;
import pt.ua.deti.apieasyspot.billing.dto.PaymentStatusResponse;
import pt.ua.deti.apieasyspot.billing.dto.RefundRequest;
import pt.ua.deti.apieasyspot.billing.model.PaymentStatus;
import pt.ua.deti.apieasyspot.billing.service.StripeService;

import java.math.BigDecimal;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static pt.ua.deti.apieasyspot.support.TestJwtRequests.jwtWithRole;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
class PaymentControllerIT {

    @Autowired
    private WebApplicationContext wac;

    @MockitoBean
    private StripeService stripeService;

    private final ObjectMapper objectMapper = new ObjectMapper()
        .registerModule(new JavaTimeModule());

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();
    }

    // --- Checkout Session ---

    @Test
    @DisplayName("POST /payments/checkout-session as DRIVER returns 200 with session")
    void createCheckoutSession_asDriver_returns200() throws Exception {
        UUID reservationId = UUID.randomUUID();
        CheckoutSessionRequest request = new CheckoutSessionRequest(
            reservationId, new BigDecimal("15.00"), "EUR", "user@example.com",
            "http://success", "http://cancel"
        );
        when(stripeService.createCheckoutSession(any()))
            .thenReturn(new CheckoutSessionResponse("cs_test_123", "https://checkout.stripe.com/cs_test_123"));

        mockMvc.perform(post("/api/payments/checkout-session")
                .with(jwtWithRole("sub-123", "DRIVER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.sessionId").value("cs_test_123"))
            .andExpect(jsonPath("$.sessionUrl").exists());
    }

    @Test
    @DisplayName("POST /payments/checkout-session as MANAGER returns 403")
    void createCheckoutSession_asManager_returns403() throws Exception {
        CheckoutSessionRequest request = new CheckoutSessionRequest(
            UUID.randomUUID(), new BigDecimal("15.00"), "EUR", "user@example.com",
            "http://success", "http://cancel"
        );

        mockMvc.perform(post("/api/payments/checkout-session")
                .with(jwtWithRole("sub-456", "MANAGER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /payments/checkout-session unauthenticated returns 401")
    void createCheckoutSession_unauthenticated_returns401() throws Exception {
        CheckoutSessionRequest request = new CheckoutSessionRequest(
            UUID.randomUUID(), new BigDecimal("15.00"), "EUR", "user@example.com",
            "http://success", "http://cancel"
        );

        mockMvc.perform(post("/api/payments/checkout-session")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /payments/checkout-session with missing required fields returns 400")
    void createCheckoutSession_missingFields_returns400() throws Exception {
        String invalidBody = """
            {"reservationId": null, "amount": -5, "currency": "EU"}
            """;

        mockMvc.perform(post("/api/payments/checkout-session")
                .with(jwtWithRole("sub-123", "DRIVER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidBody))
            .andExpect(status().isBadRequest());
    }

    // --- Payment Status ---

    @Test
    @DisplayName("POST /payments/setup-intent authenticated returns 200")
    void createSetupIntent_authenticated_returns200() throws Exception {
        when(stripeService.createSetupIntent(eq("sub-123"), any())).thenReturn("seti_secret_123");

        mockMvc.perform(post("/api/payments/setup-intent")
                .with(jwtWithRole("sub-123", "DRIVER")))
            .andExpect(status().isOk())
            .andExpect(content().string("seti_secret_123"));
    }

    @Test
    @DisplayName("GET /payments/status authenticated returns 200 with status")
    void getPaymentStatus_authenticated_returns200() throws Exception {
        UUID reservationId = UUID.randomUUID();
        PaymentStatusResponse response = new PaymentStatusResponse(
            reservationId, PaymentStatus.COMPLETED, new BigDecimal("15.00"), "eur", "pi_123"
        );
        when(stripeService.getPaymentStatus(reservationId)).thenReturn(response);

        mockMvc.perform(get("/api/payments/status")
                .with(jwtWithRole("sub-123", "DRIVER"))
                .param("reservationId", reservationId.toString()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("COMPLETED"))
            .andExpect(jsonPath("$.paymentIntentId").value("pi_123"));
    }

    @Test
    @DisplayName("GET /payments/status unauthenticated returns 401")
    void getPaymentStatus_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/payments/status")
                .param("reservationId", UUID.randomUUID().toString()))
            .andExpect(status().isUnauthorized());
    }

    // --- Refund ---

    @Test
    @DisplayName("POST /payments/refund as MANAGER returns 200")
    void refundPayment_asManager_returns200() throws Exception {
        RefundRequest request = new RefundRequest(UUID.randomUUID(), new BigDecimal("5.00"), "requested_by_customer");

        mockMvc.perform(post("/api/payments/refund")
                .with(jwtWithRole("mgr-123", "MANAGER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST /payments/refund as DRIVER returns 403")
    void refundPayment_asDriver_returns403() throws Exception {
        RefundRequest request = new RefundRequest(UUID.randomUUID(), null, null);

        mockMvc.perform(post("/api/payments/refund")
                .with(jwtWithRole("sub-123", "DRIVER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /payments/refund unauthenticated returns 401")
    void refundPayment_unauthenticated_returns401() throws Exception {
        RefundRequest request = new RefundRequest(UUID.randomUUID(), null, null);

        mockMvc.perform(post("/api/payments/refund")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isUnauthorized());
    }

    // --- Customer Portal ---

    @Test
    @DisplayName("GET /payments/customer-portal as DRIVER returns 200")
    void customerPortal_asDriver_returns200() throws Exception {
        when(stripeService.createCustomerPortalSession(eq("sub-123"), any()))
            .thenReturn("https://billing.stripe.com/portal/test");

        mockMvc.perform(get("/api/payments/customer-portal")
                .with(jwtWithRole("sub-123", "DRIVER")))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /payments/customer-portal as MANAGER returns 403")
    void customerPortal_asManager_returns403() throws Exception {
        mockMvc.perform(get("/api/payments/customer-portal")
                .with(jwtWithRole("mgr-123", "MANAGER")))
            .andExpect(status().isForbidden());
    }

    // --- Webhook ---

    @Test
    @DisplayName("POST /stripe/webhook without Stripe-Signature header returns 400")
    void webhook_noSignatureHeader_returns400() throws Exception {
        mockMvc.perform(post("/api/stripe/webhook")
                .content("{}")
                .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /stripe/webhook with invalid signature returns 400")
    void webhook_invalidSignature_returns400() throws Exception {
        mockMvc.perform(post("/api/stripe/webhook")
                .header("Stripe-Signature", "t=invalid,v1=invalid")
                .content("{\"id\":\"evt_test\",\"type\":\"payment_intent.succeeded\"}")
                .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isBadRequest());
    }

    // --- Setup Status ---

    @Test
    @DisplayName("GET /payments/setup-status authenticated returns 200 with configured=true")
    void getSetupStatus_authenticated_returns200() throws Exception {
        when(stripeService.getPaymentSetupStatus(eq("sub-123"), any()))
            .thenReturn(new PaymentSetupStatusResponse(true));

        mockMvc.perform(get("/api/payments/setup-status")
                .with(jwtWithRole("sub-123", "DRIVER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.configured").value(true));
    }

    @Test
    @DisplayName("GET /payments/setup-status unauthenticated returns 401")
    void getSetupStatus_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/payments/setup-status"))
            .andExpect(status().isUnauthorized());
    }

    // --- List Payment Methods ---

    @Test
    @DisplayName("GET /payments/methods authenticated returns 200 with list")
    void listPaymentMethods_authenticated_returns200() throws Exception {
        PaymentMethodSummaryResponse method = new PaymentMethodSummaryResponse(
            "pm_123", "card", "visa", "4242", 12L, 2026L, true
        );
        when(stripeService.listPaymentMethods(eq("sub-123"), any()))
            .thenReturn(java.util.List.of(method));

        mockMvc.perform(get("/api/payments/methods")
                .with(jwtWithRole("sub-123", "DRIVER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value("pm_123"))
            .andExpect(jsonPath("$[0].brand").value("visa"))
            .andExpect(jsonPath("$[0].last4").value("4242"));
    }

    @Test
    @DisplayName("GET /payments/methods unauthenticated returns 401")
    void listPaymentMethods_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/payments/methods"))
            .andExpect(status().isUnauthorized());
    }

    // --- Detach Payment Method ---

    @Test
    @DisplayName("DELETE /payments/methods/{id} authenticated returns 204")
    void detachPaymentMethod_authenticated_returns204() throws Exception {
        mockMvc.perform(delete("/api/payments/methods/pm_123")
                .with(jwtWithRole("sub-123", "DRIVER")))
            .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("DELETE /payments/methods/{id} unauthenticated returns 401")
    void detachPaymentMethod_unauthenticated_returns401() throws Exception {
        mockMvc.perform(delete("/api/payments/methods/pm_123"))
            .andExpect(status().isUnauthorized());
    }
}
