package pt.ua.deti.apieasyspot.billing.service;

import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.Charge;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.model.Refund;
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
import org.springframework.transaction.annotation.Transactional;
import pt.ua.deti.apieasyspot.billing.dto.CheckoutSessionRequest;
import pt.ua.deti.apieasyspot.billing.dto.CheckoutSessionResponse;
import pt.ua.deti.apieasyspot.billing.dto.PaymentStatusResponse;
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

    @PostConstruct
    public void init() {
        Stripe.apiKey = stripeApiKey;
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

    public String createSetupIntent(String customerEmail) throws StripeException {
        com.stripe.param.CustomerListParams listParams = com.stripe.param.CustomerListParams.builder()
            .setEmail(customerEmail)
            .setLimit(1L)
            .build();
        var customers = com.stripe.model.Customer.list(listParams).getData();

        String customerId;
        if (customers.isEmpty()) {
            var createParams = com.stripe.param.CustomerCreateParams.builder()
                .setEmail(customerEmail)
                .build();
            customerId = com.stripe.model.Customer.create(createParams).getId();
        } else {
            customerId = customers.get(0).getId();
        }

        var params = com.stripe.param.SetupIntentCreateParams.builder()
            .setCustomer(customerId)
            .addPaymentMethodType("card")
            .build();

        return com.stripe.model.SetupIntent.create(params).getClientSecret();
    }

    public String createCustomerPortalSession(String customerEmail) throws StripeException {
        com.stripe.param.CustomerListParams listParams = com.stripe.param.CustomerListParams.builder()
            .setEmail(customerEmail)
            .setLimit(1L)
            .build();
        var customers = com.stripe.model.Customer.list(listParams).getData();

        if (customers.isEmpty()) {
            throw new ResourceNotFoundException("No Stripe customer found for email: " + customerEmail);
        }

        com.stripe.param.billingportal.SessionCreateParams params =
            com.stripe.param.billingportal.SessionCreateParams.builder()
                .setCustomer(customers.get(0).getId())
                .setReturnUrl(frontendUrl + "/perfil")
                .build();

        return com.stripe.model.billingportal.Session.create(params).getUrl();
    }
}
