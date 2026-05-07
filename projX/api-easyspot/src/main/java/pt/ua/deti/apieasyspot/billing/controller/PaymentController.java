package pt.ua.deti.apieasyspot.billing.controller;

import com.stripe.exception.StripeException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
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
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Payments", description = "Stripe Payment Integration")
public class PaymentController {

    private static final String CODE_200 = "200";
    private static final String CODE_400 = "400";
    private static final String CODE_401 = "401";
    private static final String CODE_403 = "403";
    private static final String CODE_404 = "404";
    private static final String AUTH_TOKEN_MISSING = "Missing or invalid authentication token";
    private static final String NOT_A_DRIVER = "User is authenticated but not a DRIVER";
    private static final String IS_AUTHENTICATED = "isAuthenticated()";
    private static final String CLAIM_EMAIL = "email";

    private final StripeService stripeService;

    @Operation(summary = "Create Stripe Checkout Session")
    @ApiResponse(responseCode = CODE_200, description = "Checkout session created successfully")
    @ApiResponse(responseCode = CODE_400, description = "Invalid checkout request payload")
    @ApiResponse(responseCode = CODE_401, description = AUTH_TOKEN_MISSING)
    @ApiResponse(responseCode = CODE_403, description = NOT_A_DRIVER)
    @PostMapping("/payments/checkout-session")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<CheckoutSessionResponse> createCheckoutSession(
            @Valid @RequestBody CheckoutSessionRequest request) throws StripeException {
        return ResponseEntity.ok(stripeService.createCheckoutSession(request));
    }

    @Operation(summary = "Stripe Webhook Handler")
    @ApiResponse(responseCode = CODE_200, description = "Webhook processed successfully")
    @ApiResponse(responseCode = CODE_400, description = "Invalid webhook payload or signature")
    @PostMapping("/stripe/webhook")
    public ResponseEntity<Void> handleWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader) throws Exception {
        stripeService.handleWebhook(payload, sigHeader);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Create Stripe SetupIntent for saving a payment method")
    @ApiResponse(responseCode = CODE_200, description = "SetupIntent client secret returned")
    @ApiResponse(responseCode = CODE_401, description = AUTH_TOKEN_MISSING)
    @ApiResponse(responseCode = CODE_403, description = NOT_A_DRIVER)
    @PostMapping("/payments/setup-intent")
    @PreAuthorize(IS_AUTHENTICATED)
    public ResponseEntity<String> createSetupIntent(
            @AuthenticationPrincipal Jwt jwt) throws StripeException {
        return ResponseEntity.ok(stripeService.createSetupIntent(jwt.getSubject(), jwt.getClaimAsString(CLAIM_EMAIL)));
    }

    @Operation(summary = "Get payment method setup status for authenticated user")
    @ApiResponse(responseCode = CODE_200, description = "Payment setup status returned")
    @ApiResponse(responseCode = CODE_401, description = AUTH_TOKEN_MISSING)
    @GetMapping("/payments/setup-status")
    @PreAuthorize(IS_AUTHENTICATED)
    public ResponseEntity<PaymentSetupStatusResponse> getPaymentSetupStatus(
            @AuthenticationPrincipal Jwt jwt) throws StripeException {
        return ResponseEntity.ok(stripeService.getPaymentSetupStatus(jwt.getSubject(), jwt.getClaimAsString(CLAIM_EMAIL)));
    }

    @Operation(summary = "Generate Stripe Customer Portal Session")
    @ApiResponse(responseCode = CODE_200, description = "Customer portal URL generated successfully")
    @ApiResponse(responseCode = CODE_401, description = AUTH_TOKEN_MISSING)
    @ApiResponse(responseCode = CODE_403, description = NOT_A_DRIVER)
    @GetMapping("/payments/customer-portal")
    @PreAuthorize(IS_AUTHENTICATED)
    public ResponseEntity<String> createCustomerPortalSession(
            @AuthenticationPrincipal Jwt jwt) throws StripeException {
        return ResponseEntity.ok(stripeService.createCustomerPortalSession(jwt.getSubject(), jwt.getClaimAsString(CLAIM_EMAIL)));
    }

    @Operation(summary = "List Stripe payment methods for authenticated user")
    @ApiResponse(responseCode = CODE_200, description = "Payment methods listed successfully")
    @ApiResponse(responseCode = CODE_401, description = AUTH_TOKEN_MISSING)
    @GetMapping("/payments/methods")
    @PreAuthorize(IS_AUTHENTICATED)
    public ResponseEntity<List<PaymentMethodSummaryResponse>> listPaymentMethods(
            @AuthenticationPrincipal Jwt jwt) throws StripeException {
        return ResponseEntity.ok(stripeService.listPaymentMethods(jwt.getSubject(), jwt.getClaimAsString(CLAIM_EMAIL)));
    }

    @Operation(summary = "Detach Stripe payment method for authenticated user")
    @ApiResponse(responseCode = "204", description = "Payment method detached successfully")
    @ApiResponse(responseCode = CODE_401, description = AUTH_TOKEN_MISSING)
    @ApiResponse(responseCode = CODE_404, description = "Payment method not found")
    @DeleteMapping("/payments/methods/{paymentMethodId}")
    @PreAuthorize(IS_AUTHENTICATED)
    public ResponseEntity<Void> detachPaymentMethod(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String paymentMethodId) throws StripeException {
        stripeService.detachPaymentMethod(jwt.getSubject(), jwt.getClaimAsString(CLAIM_EMAIL), paymentMethodId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Get Payment Status")
    @ApiResponse(responseCode = CODE_200, description = "Payment status retrieved successfully")
    @ApiResponse(responseCode = CODE_400, description = "Invalid reservationId format")
    @ApiResponse(responseCode = CODE_401, description = AUTH_TOKEN_MISSING)
    @ApiResponse(responseCode = CODE_404, description = "Reservation not found")
    @GetMapping("/payments/status")
    @PreAuthorize(IS_AUTHENTICATED)
    public ResponseEntity<PaymentStatusResponse> getPaymentStatus(
            @Parameter(description = "Reservation UUID to query payment status", example = "9f6a9a7b-c6a2-43a2-a2b6-f57e6d03df57")
            @RequestParam UUID reservationId) {
        return ResponseEntity.ok(stripeService.getPaymentStatus(reservationId));
    }

    @Operation(summary = "Refund Payment")
    @ApiResponse(responseCode = CODE_200, description = "Refund processed successfully")
    @ApiResponse(responseCode = CODE_400, description = "Invalid refund request payload")
    @ApiResponse(responseCode = CODE_401, description = AUTH_TOKEN_MISSING)
    @ApiResponse(responseCode = CODE_403, description = "User is authenticated but not a MANAGER")
    @ApiResponse(responseCode = CODE_404, description = "Payment not found")
    @PostMapping("/payments/refund")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<Void> refundPayment(
            @Valid @RequestBody RefundRequest request) throws StripeException {
        stripeService.refundPayment(request);
        return ResponseEntity.ok().build();
    }
}
