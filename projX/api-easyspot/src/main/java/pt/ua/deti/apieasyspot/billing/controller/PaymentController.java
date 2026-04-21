package pt.ua.deti.apieasyspot.billing.controller;

import com.stripe.exception.StripeException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import pt.ua.deti.apieasyspot.billing.dto.*;
import pt.ua.deti.apieasyspot.billing.service.StripeService;

import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Payments", description = "Stripe Payment Integration")
public class PaymentController {

    private final StripeService stripeService;

    @Operation(summary = "Create Stripe Checkout Session")
    @PostMapping("/payments/checkout-session")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<CheckoutSessionResponse> createCheckoutSession(
            @Valid @RequestBody CheckoutSessionRequest request) throws StripeException {
        return ResponseEntity.ok(stripeService.createCheckoutSession(request));
    }

    @Operation(summary = "Stripe Webhook Handler")
    @PostMapping("/stripe/webhook")
    public ResponseEntity<Void> handleWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader) throws Exception {
        stripeService.handleWebhook(payload, sigHeader);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Generate Stripe Customer Portal Session")
    @GetMapping("/payments/customer-portal")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<String> createCustomerPortalSession(
            @AuthenticationPrincipal Jwt jwt) throws StripeException {
        String email = jwt.getClaimAsString("email");
        return ResponseEntity.ok(stripeService.createCustomerPortalSession(email));
    }

    @Operation(summary = "Get Payment Status")
    @GetMapping("/payments/status")
    public ResponseEntity<PaymentStatusResponse> getPaymentStatus(
            @RequestParam UUID reservationId) {
        return ResponseEntity.ok(stripeService.getPaymentStatus(reservationId));
    }

    @Operation(summary = "Refund Payment")
    @PostMapping("/payments/refund")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<Void> refundPayment(
            @Valid @RequestBody RefundRequest request) throws StripeException {
        stripeService.refundPayment(request);
        return ResponseEntity.ok().build();
    }
}
