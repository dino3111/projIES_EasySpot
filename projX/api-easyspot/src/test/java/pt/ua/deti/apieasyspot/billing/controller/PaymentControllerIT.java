package pt.ua.deti.apieasyspot.billing.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
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
import pt.ua.deti.apieasyspot.billing.dto.PaymentStatusResponse;
import pt.ua.deti.apieasyspot.billing.model.PaymentStatus;
import pt.ua.deti.apieasyspot.billing.service.StripeService;

import java.math.BigDecimal;
import java.util.UUID;

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
            .registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();
    }

    @Test
    void testCreateCheckoutSession() throws Exception {
        UUID reservationId = UUID.randomUUID();
        CheckoutSessionRequest request = new CheckoutSessionRequest(
            reservationId, new BigDecimal("15.00"), "EUR", "user@example.com", "http://success", "http://cancel"
        );

        mockMvc.perform(post("/api/payments/checkout-session")
                .with(jwtWithRole("sub-123", "DRIVER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    void testGetPaymentStatus() throws Exception {
        UUID reservationId = UUID.randomUUID();
        PaymentStatusResponse response = new PaymentStatusResponse(
            reservationId, PaymentStatus.COMPLETED, new BigDecimal("15.00"), "EUR", "pi_123"
        );

        when(stripeService.getPaymentStatus(reservationId)).thenReturn(response);

        mockMvc.perform(get("/api/payments/status")
                .with(jwtWithRole("sub-123", "DRIVER"))
                .param("reservationId", reservationId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));
    }

    @Test
    void testWebhook_NoSignature() throws Exception {
        mockMvc.perform(post("/api/stripe/webhook")
                .content("{}")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }
}
