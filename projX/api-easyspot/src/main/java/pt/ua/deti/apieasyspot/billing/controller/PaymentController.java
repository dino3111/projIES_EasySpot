package pt.ua.deti.apieasyspot.billing.controller;

import com.stripe.exception.StripeException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
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
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Checkout session created successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid checkout request payload"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid authentication token"),
        @ApiResponse(responseCode = "403", description = "User is authenticated but not a DRIVER")
    })
    @PostMapping("/payments/checkout-session")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<CheckoutSessionResponse> createCheckoutSession(
            @Valid @RequestBody CheckoutSessionRequest request) throws StripeException {
        return ResponseEntity.ok(stripeService.createCheckoutSession(request));
    }

    @Operation(summary = "Stripe Webhook Handler")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Webhook processed successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid webhook payload or signature")
    })
    @PostMapping("/stripe/webhook")
    public ResponseEntity<Void> handleWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader) throws Exception {
        stripeService.handleWebhook(payload, sigHeader);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Create Stripe SetupIntent for saving a payment method")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "SetupIntent client secret returned"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid authentication token"),
        @ApiResponse(responseCode = "403", description = "User is authenticated but not a DRIVER")
    })
    @PostMapping("/payments/setup-intent")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<String> createSetupIntent(
            @AuthenticationPrincipal Jwt jwt) throws StripeException {
        return ResponseEntity.ok(stripeService.createSetupIntent(jwt.getSubject(), jwt.getClaimAsString("email")));
    }

    @Operation(summary = "Get payment method setup status for authenticated user")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Payment setup status returned"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid authentication token")
    })
    @GetMapping("/payments/setup-status")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PaymentSetupStatusResponse> getPaymentSetupStatus(
            @AuthenticationPrincipal Jwt jwt) throws StripeException {
        return ResponseEntity.ok(stripeService.getPaymentSetupStatus(jwt.getSubject(), jwt.getClaimAsString("email")));
    }

    @Operation(summary = "Generate Stripe Customer Portal Session")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Customer portal URL generated successfully"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid authentication token"),
        @ApiResponse(responseCode = "403", description = "User is authenticated but not a DRIVER")
    })
    @GetMapping("/payments/customer-portal")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<String> createCustomerPortalSession(
            @AuthenticationPrincipal Jwt jwt) throws StripeException {
        return ResponseEntity.ok(stripeService.createCustomerPortalSession(jwt.getSubject(), jwt.getClaimAsString("email")));
    }

    @Operation(summary = "Get Payment Status")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Payment status retrieved successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid reservationId format"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid authentication token"),
        @ApiResponse(responseCode = "404", description = "Reservation not found")
    })
    @GetMapping("/payments/status")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PaymentStatusResponse> getPaymentStatus(
            @Parameter(description = "Reservation UUID to query payment status", example = "9f6a9a7b-c6a2-43a2-a2b6-f57e6d03df57")
            @RequestParam UUID reservationId) {
        return ResponseEntity.ok(stripeService.getPaymentStatus(reservationId));
    }

    @Operation(summary = "Refund Payment")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Refund processed successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid refund request payload"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid authentication token"),
        @ApiResponse(responseCode = "403", description = "User is authenticated but not a MANAGER"),
        @ApiResponse(responseCode = "404", description = "Payment not found")
    })
    @PostMapping("/payments/refund")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<Void> refundPayment(
            @Valid @RequestBody RefundRequest request) throws StripeException {
        stripeService.refundPayment(request);
        return ResponseEntity.ok().build();
    }
}
