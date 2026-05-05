package pt.ua.deti.apieasyspot.billing.service;

import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.Charge;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.model.PaymentMethod;
import com.stripe.model.Refund;
import com.stripe.model.PaymentMethodCollection;
import com.stripe.model.Customer;
import com.stripe.model.checkout.Session;
import com.stripe.net.RequestOptions;
import com.stripe.net.Webhook;
import com.stripe.param.RefundCreateParams;
import com.stripe.param.checkout.SessionCreateParams;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.transaction.annotation.Transactional;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.billing.dto.CheckoutSessionRequest;
import pt.ua.deti.apieasyspot.billing.dto.CheckoutSessionResponse;
import pt.ua.deti.apieasyspot.billing.dto.PaymentSetupStatusResponse;
import pt.ua.deti.apieasyspot.billing.dto.PaymentStatusResponse;
import pt.ua.deti.apieasyspot.billing.dto.PaymentMethodSummaryResponse;
import pt.ua.deti.apieasyspot.billing.dto.RefundRequest;
import pt.ua.deti.apieasyspot.billing.model.PaymentRecord;
import pt.ua.deti.apieasyspot.billing.model.PaymentStatus;
import pt.ua.deti.apieasyspot.billing.model.StripeEvent;
import pt.ua.deti.apieasyspot.billing.repository.PaymentRecordRepository;
import pt.ua.deti.apieasyspot.billing.repository.StripeEventRepository;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;
import pt.ua.deti.apieasyspot.common.exception.UnprocessableEntityException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class StripeService {

    @Value("${stripe.api.key}")
    private String stripeApiKey;

    @Value("${stripe.webhook.secret}")
    private String endpointSecret;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    private final PaymentRecordRepository paymentRecordRepository;
    private final StripeEventRepository stripeEventRepository;
    private final BillingNotificationService notificationService;
    private final UserRepository userRepository;

    @PostConstruct
    public void init() {
        Stripe.apiKey = stripeApiKey;
        if (!StringUtils.hasText(stripeApiKey)) {
            log.warn("Stripe API key is not configured. Stripe setup intents and customer portal will fail until STRIPE_API_KEY is provided.");
        }
    }

    public CheckoutSessionResponse createCheckoutSession(CheckoutSessionRequest request) throws StripeException {
        String currency = request.currency().toLowerCase();
        long amountInCents = request.amount()
            .multiply(BigDecimal.valueOf(100))
            .setScale(0, RoundingMode.HALF_UP)
            .longValueExact();

        SessionCreateParams params = SessionCreateParams.builder()
            .setMode(SessionCreateParams.Mode.PAYMENT)
            .setSuccessUrl(request.successUrl())
            .setCancelUrl(request.cancelUrl())
            .setCustomerEmail(request.customerEmail())
            .addLineItem(SessionCreateParams.LineItem.builder()
                .setQuantity(1L)
                .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                    .setCurrency(currency)
                    .setUnitAmount(amountInCents)
                    .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                        .setName("Parking Reservation " + request.reservationId())
                        .build())
                    .build())
                .build())
            .putMetadata("reservationId", request.reservationId().toString())
            .setPaymentIntentData(SessionCreateParams.PaymentIntentData.builder()
                .putMetadata("reservationId", request.reservationId().toString())
                .build())
            .build();

        RequestOptions options = RequestOptions.builder()
            .setIdempotencyKey("checkout-" + request.reservationId())
            .build();

        Session session = Session.create(params, options);

        PaymentRecord record = PaymentRecord.builder()
            .reservationId(request.reservationId())
            .stripeSessionId(session.getId())
            .amount(request.amount())
            .currency(currency)
            .status(PaymentStatus.PENDING)
            .customerEmail(request.customerEmail())
            .build();
        paymentRecordRepository.save(record);

        return new CheckoutSessionResponse(session.getId(), session.getUrl());
    }

    @Transactional
    public void handleWebhook(String payload, String sigHeader) throws Exception {
        Event event = Webhook.constructEvent(payload, sigHeader, endpointSecret);

        if (stripeEventRepository.existsById(event.getId())) {
            log.info("Event {} already processed, skipping", event.getId());
            return;
        }

        log.info("Processing Stripe event: {} - {}", event.getId(), event.getType());

        switch (event.getType()) {
            case "checkout.session.completed" ->
                handleCheckoutSessionCompleted((Session) event.getDataObjectDeserializer().getObject().orElseThrow());
            case "payment_intent.succeeded" ->
                handlePaymentIntentSucceeded((PaymentIntent) event.getDataObjectDeserializer().getObject().orElseThrow());
            case "payment_intent.payment_failed" ->
                handlePaymentIntentFailed((PaymentIntent) event.getDataObjectDeserializer().getObject().orElseThrow());
            case "charge.refunded" ->
                handleChargeRefunded((Charge) event.getDataObjectDeserializer().getObject().orElseThrow());
            default -> log.info("Unhandled event type: {}", event.getType());
        }

        stripeEventRepository.save(new StripeEvent(event.getId(), null));
    }

    private void handleCheckoutSessionCompleted(Session session) {
        if (session.getMetadata().get("reservationId") == null) return;

        paymentRecordRepository.findByStripeSessionId(session.getId()).ifPresent(record -> {
            record.setPaymentIntentId(session.getPaymentIntent());
            paymentRecordRepository.save(record);
            log.info("Checkout session completed for reservation {}", record.getReservationId());
        });
    }

    private void handlePaymentIntentSucceeded(PaymentIntent pi) {
        Optional<PaymentRecord> recordOpt = paymentRecordRepository.findByPaymentIntentId(pi.getId());
        if (recordOpt.isEmpty()) {
            String reservationIdStr = pi.getMetadata().get("reservationId");
            if (reservationIdStr != null) {
                recordOpt = paymentRecordRepository.findTopByReservationIdOrderByCreatedAtDesc(
                    UUID.fromString(reservationIdStr));
            }
        }

        recordOpt.ifPresent(record -> {
            record.setPaymentIntentId(pi.getId());
            record.setStatus(PaymentStatus.COMPLETED);
            paymentRecordRepository.save(record);
            notificationService.notifyPaymentSuccess(record);
            log.info("Payment succeeded for reservation {}", record.getReservationId());
        });
    }

    private void handlePaymentIntentFailed(PaymentIntent pi) {
        Optional<PaymentRecord> recordOpt = paymentRecordRepository.findByPaymentIntentId(pi.getId());
        if (recordOpt.isEmpty()) {
            String reservationIdStr = pi.getMetadata().get("reservationId");
            if (reservationIdStr != null) {
                recordOpt = paymentRecordRepository.findTopByReservationIdOrderByCreatedAtDesc(
                    UUID.fromString(reservationIdStr));
            }
        }

        recordOpt.ifPresent(record -> {
            record.setStatus(PaymentStatus.FAILED);
            paymentRecordRepository.save(record);
            notificationService.notifyPaymentFailure(record);
            log.warn("Payment failed for reservation {}", record.getReservationId());
        });
    }

    private void handleChargeRefunded(Charge charge) {
        if (charge.getPaymentIntent() == null) return;

        paymentRecordRepository.findByPaymentIntentId(charge.getPaymentIntent()).ifPresent(record -> {
            boolean fullRefund = charge.getAmountRefunded().equals(charge.getAmount());
            record.setStatus(fullRefund ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED);
            paymentRecordRepository.save(record);
            log.info("Charge refunded (full={}) for reservation {}", fullRefund, record.getReservationId());
        });
    }

    public PaymentStatusResponse getPaymentStatus(UUID reservationId) {
        PaymentRecord record = paymentRecordRepository.findTopByReservationIdOrderByCreatedAtDesc(reservationId)
            .orElseThrow(() -> new ResourceNotFoundException("Payment not found for reservation: " + reservationId));

        return new PaymentStatusResponse(
            record.getReservationId(),
            record.getStatus(),
            record.getAmount(),
            record.getCurrency(),
            record.getPaymentIntentId()
        );
    }

    @Transactional
    public void refundPayment(RefundRequest request) throws StripeException {
        PaymentRecord record = paymentRecordRepository.findTopByReservationIdOrderByCreatedAtDesc(request.reservationId())
            .orElseThrow(() -> new ResourceNotFoundException("Payment not found for reservation: " + request.reservationId()));

        if (record.getStatus() != PaymentStatus.COMPLETED) {
            throw new UnprocessableEntityException("Cannot refund a payment with status: " + record.getStatus());
        }

        long amountInCents = request.amount() != null
            ? request.amount().multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.HALF_UP).longValueExact()
            : 0L;

        RefundCreateParams.Builder paramsBuilder = RefundCreateParams.builder()
            .setPaymentIntent(record.getPaymentIntentId());
        if (amountInCents > 0) {
            paramsBuilder.setAmount(amountInCents);
        }

        Refund refund = Refund.create(paramsBuilder.build());

        if ("succeeded".equals(refund.getStatus())) {
            record.setStatus(request.amount() == null ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED);
            paymentRecordRepository.save(record);
            log.info("Refund successful for reservation {}", record.getReservationId());
        }
    }

    public String createSetupIntent(String authentikUserId, String tokenEmail) throws StripeException {
        ensureStripeConfigured();
        String customerEmail = resolveCustomerEmail(authentikUserId, tokenEmail);
        log.info("Creating Stripe SetupIntent for user={} email={}", authentikUserId, customerEmail);

        String customerId = findCustomerIdByEmail(customerEmail);
        if (customerId == null) {
            var createParams = com.stripe.param.CustomerCreateParams.builder()
                .setEmail(customerEmail)
                .build();
            customerId = com.stripe.model.Customer.create(createParams).getId();
        }

        var params = com.stripe.param.SetupIntentCreateParams.builder()
            .setCustomer(customerId)
            .build();

        String clientSecret = com.stripe.model.SetupIntent.create(params).getClientSecret();
        log.info("Stripe SetupIntent created successfully for user={} customer={}", authentikUserId, customerId);
        return clientSecret;
    }

    public String createCustomerPortalSession(String authentikUserId, String tokenEmail) throws StripeException {
        ensureStripeConfigured();
        String customerEmail = resolveCustomerEmail(authentikUserId, tokenEmail);
        log.info("Creating Stripe customer portal session for user={} email={}", authentikUserId, customerEmail);

        String customerId = findCustomerIdByEmail(customerEmail);
        if (customerId == null) {
            throw new ResourceNotFoundException("No Stripe customer found for email: " + customerEmail);
        }

        com.stripe.param.billingportal.SessionCreateParams params =
            com.stripe.param.billingportal.SessionCreateParams.builder()
                .setCustomer(customerId)
                .setReturnUrl(frontendUrl + "/perfil")
                .build();

        return com.stripe.model.billingportal.Session.create(params).getUrl();
    }

    public PaymentSetupStatusResponse getPaymentSetupStatus(String authentikUserId, String tokenEmail) throws StripeException {
        ensureStripeConfigured();
        String customerEmail = resolveCustomerEmail(authentikUserId, tokenEmail);
        String customerId = findCustomerIdByEmail(customerEmail);

        if (customerId == null) {
            log.info("Stripe setup status for user={} email={} -> no customer yet", authentikUserId, customerEmail);
            return new PaymentSetupStatusResponse(false);
        }

        PaymentMethodCollection paymentMethods = com.stripe.model.PaymentMethod.list(
            com.stripe.param.PaymentMethodListParams.builder()
                .setCustomer(customerId)
                .setType(com.stripe.param.PaymentMethodListParams.Type.CARD)
                .setLimit(1L)
                .build()
        );

        boolean configured = !paymentMethods.getData().isEmpty();
        log.info("Stripe setup status for user={} customer={} configured={}", authentikUserId, customerId, configured);
        return new PaymentSetupStatusResponse(configured);
    }

    public List<PaymentMethodSummaryResponse> listPaymentMethods(String authentikUserId, String tokenEmail) throws StripeException {
        ensureStripeConfigured();
        String customerEmail = resolveCustomerEmail(authentikUserId, tokenEmail);
        String customerId = findCustomerIdByEmail(customerEmail);

        if (customerId == null) {
            return List.of();
        }

        Customer customer = Customer.retrieve(customerId);
        String defaultPaymentMethodId = customer.getInvoiceSettings() != null
            ? customer.getInvoiceSettings().getDefaultPaymentMethod()
            : null;

        PaymentMethodCollection paymentMethods = PaymentMethod.list(
            com.stripe.param.PaymentMethodListParams.builder()
                .setCustomer(customerId)
                .setLimit(20L)
                .build()
        );

        return paymentMethods.getData().stream()
            .map(method -> toSummary(method, defaultPaymentMethodId))
            .toList();
    }

    public void detachPaymentMethod(String authentikUserId, String tokenEmail, String paymentMethodId) throws StripeException {
        ensureStripeConfigured();
        String customerEmail = resolveCustomerEmail(authentikUserId, tokenEmail);
        String customerId = findCustomerIdByEmail(customerEmail);

        if (customerId == null) {
            throw new ResourceNotFoundException("No Stripe customer found for authenticated user");
        }

        PaymentMethod method = PaymentMethod.retrieve(paymentMethodId);
        if (method.getCustomer() == null || !customerId.equals(method.getCustomer())) {
            throw new ResourceNotFoundException("Payment method not found for authenticated user");
        }

        method.detach();
        log.info("Detached Stripe payment method {} for user={} customer={}", paymentMethodId, authentikUserId, customerId);
    }

    private void ensureStripeConfigured() {
        if (!StringUtils.hasText(stripeApiKey)) {
            throw new IllegalStateException("Stripe is not configured on the server");
        }
    }

    private String findCustomerIdByEmail(String customerEmail) throws StripeException {
        com.stripe.param.CustomerListParams listParams = com.stripe.param.CustomerListParams.builder()
            .setEmail(customerEmail)
            .setLimit(1L)
            .build();
        var customers = com.stripe.model.Customer.list(listParams).getData();
        return customers.isEmpty() ? null : customers.get(0).getId();
    }

    private String resolveCustomerEmail(String authentikUserId, String tokenEmail) {
        if (StringUtils.hasText(tokenEmail)) {
            return tokenEmail;
        }

        return userRepository.findByAuthentikUserId(authentikUserId)
            .map(user -> user.getEmail())
            .filter(StringUtils::hasText)
            .orElseThrow(() -> new IllegalStateException(
                "Authenticated user does not have an email address available for Stripe"));
    }

    private PaymentMethodSummaryResponse toSummary(PaymentMethod method, String defaultPaymentMethodId) {
        String brand = null;
        String last4 = null;
        Long expMonth = null;
        Long expYear = null;
        if (method.getCard() != null) {
            brand = method.getCard().getBrand();
            last4 = method.getCard().getLast4();
            expMonth = method.getCard().getExpMonth();
            expYear = method.getCard().getExpYear();
        }
        return new PaymentMethodSummaryResponse(
            method.getId(),
            method.getType(),
            brand,
            last4,
            expMonth,
            expYear,
            method.getId().equals(defaultPaymentMethodId)
        );
    }
}
