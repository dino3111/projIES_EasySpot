package pt.ua.deti.apieasyspot.billing.service;

import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.model.Refund;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.RefundCreateParams;
import com.stripe.param.checkout.SessionCreateParams;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pt.ua.deti.apieasyspot.billing.dto.*;
import pt.ua.deti.apieasyspot.billing.model.PaymentRecord;
import pt.ua.deti.apieasyspot.billing.model.PaymentStatus;
import pt.ua.deti.apieasyspot.billing.model.StripeEvent;
import pt.ua.deti.apieasyspot.billing.repository.PaymentRecordRepository;
import pt.ua.deti.apieasyspot.billing.repository.StripeEventRepository;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;

import java.math.BigDecimal;
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

    private final PaymentRecordRepository paymentRecordRepository;
    private final StripeEventRepository stripeEventRepository;
    private final BillingNotificationService notificationService;

    @PostConstruct
    public void init() {
        Stripe.apiKey = stripeApiKey;
    }

    public CheckoutSessionResponse createCheckoutSession(CheckoutSessionRequest request) throws StripeException {
        SessionCreateParams params = SessionCreateParams.builder()
            .setMode(SessionCreateParams.Mode.PAYMENT)
            .setSuccessUrl(request.successUrl())
            .setCancelUrl(request.cancelUrl())
            .setCustomerEmail(request.customerEmail())
            .addLineItem(SessionCreateParams.LineItem.builder()
                .setQuantity(1L)
                .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                    .setCurrency(request.currency())
                    .setUnitAmount(request.amount().multiply(new BigDecimal(100)).longValue())
                    .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                        .setName("Parking Reservation " + request.reservationId())
                        .build())
                    .build())
                .build())
            .putMetadata("reservationId", request.reservationId().toString())
            .build();

        Session session = Session.create(params);

        PaymentRecord record = PaymentRecord.builder()
            .reservationId(request.reservationId())
            .stripeSessionId(session.getId())
            .amount(request.amount())
            .currency(request.currency())
            .status(PaymentStatus.PENDING)
            .customerEmail(request.customerEmail())
            .build();
        paymentRecordRepository.save(record);

        return new CheckoutSessionResponse(session.getId(), session.getUrl());
    }

    @Transactional
    public void handleWebhook(String payload, String sigHeader) throws Exception {
        Event event = Webhook.constructEvent(payload, sigHeader, endpointSecret);

        // Idempotency check
        if (stripeEventRepository.existsById(event.getId())) {
            log.info("Event {} already processed, skipping", event.getId());
            return;
        }

        log.info("Processing Stripe event: {} - {}", event.getId(), event.getType());

        switch (event.getType()) {
            case "checkout.session.completed":
                handleCheckoutSessionCompleted((Session) event.getDataObjectDeserializer().getObject().get());
                break;
            case "payment_intent.succeeded":
                handlePaymentIntentSucceeded((PaymentIntent) event.getDataObjectDeserializer().getObject().get());
                break;
            case "payment_intent.payment_failed":
                handlePaymentIntentFailed((PaymentIntent) event.getDataObjectDeserializer().getObject().get());
                break;
            case "charge.refunded":
                // Handle refunds if needed via webhook
                break;
            default:
                log.info("Unhandled event type: {}", event.getType());
        }

        stripeEventRepository.save(new StripeEvent(event.getId(), null));
    }

    private void handleCheckoutSessionCompleted(Session session) {
        String reservationIdStr = session.getMetadata().get("reservationId");
        if (reservationIdStr == null) return;

        Optional<PaymentRecord> recordOpt = paymentRecordRepository.findByStripeSessionId(session.getId());
        recordOpt.ifPresent(record -> {
            record.setPaymentIntentId(session.getPaymentIntent());
            // Status might be set to COMPLETED here or on payment_intent.succeeded
            // Stripe recommends using payment_intent.succeeded for fulfillment
        });
    }

    private void handlePaymentIntentSucceeded(PaymentIntent pi) {
        Optional<PaymentRecord> recordOpt = paymentRecordRepository.findByPaymentIntentId(pi.getId());
        if (recordOpt.isEmpty()) {
            // Try by metadata if checkout session record wasn't updated yet
            String reservationIdStr = pi.getMetadata().get("reservationId");
            if (reservationIdStr != null) {
                recordOpt = paymentRecordRepository.findByReservationId(UUID.fromString(reservationIdStr));
            }
        }

        recordOpt.ifPresent(record -> {
            record.setStatus(PaymentStatus.COMPLETED);
            paymentRecordRepository.save(record);
            notificationService.notifyPaymentSuccess(record);
            log.info("Payment succeeded for reservation {}", record.getReservationId());
        });
    }

    private void handlePaymentIntentFailed(PaymentIntent pi) {
        paymentRecordRepository.findByPaymentIntentId(pi.getId()).ifPresent(record -> {
            record.setStatus(PaymentStatus.FAILED);
            paymentRecordRepository.save(record);
            notificationService.notifyPaymentFailure(record);
            log.warn("Payment failed for reservation {}", record.getReservationId());
        });
    }

    public PaymentStatusResponse getPaymentStatus(UUID reservationId) {
        PaymentRecord record = paymentRecordRepository.findByReservationId(reservationId)
            .orElseThrow(() -> new ResourceNotFoundException("Payment record not found for reservation: " + reservationId));

        return new PaymentStatusResponse(
            record.getReservationId(),
            record.getStatus(),
            record.getAmount(),
            record.getCurrency(),
            record.getPaymentIntentId()
        );
    }

    public void refundPayment(RefundRequest request) throws StripeException {
        PaymentRecord record = paymentRecordRepository.findByReservationId(request.reservationId())
            .orElseThrow(() -> new ResourceNotFoundException("Payment record not found for reservation: " + request.reservationId()));

        if (record.getStatus() != PaymentStatus.COMPLETED) {
            throw new IllegalStateException("Cannot refund a payment that is not completed");
        }

        RefundCreateParams.Builder paramsBuilder = RefundCreateParams.builder()
            .setPaymentIntent(record.getPaymentIntentId());
        
        if (request.amount() != null) {
            paramsBuilder.setAmount(request.amount().multiply(new BigDecimal(100)).longValue());
        }

        Refund refund = Refund.create(paramsBuilder.build());

        if ("succeeded".equals(refund.getStatus())) {
            record.setStatus(request.amount() == null ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED);
            paymentRecordRepository.save(record);
            log.info("Refund successful for reservation {}", record.getReservationId());
        }
    }

    public String createCustomerPortalSession(String customerEmail) throws StripeException {
        // This requires a Stripe Customer ID. For simplicity, we search for a customer by email.
        // In a real app, you'd store stripeCustomerId in your User entity.
        com.stripe.param.CustomerListParams listParams = com.stripe.param.CustomerListParams.builder()
            .setEmail(customerEmail)
            .setLimit(1L)
            .build();
        var customers = com.stripe.model.Customer.list(listParams).getData();
        
        if (customers.isEmpty()) {
            throw new ResourceNotFoundException("Stripe customer not found for email: " + customerEmail);
        }

        com.stripe.param.billingportal.SessionCreateParams params = com.stripe.param.billingportal.SessionCreateParams.builder()
            .setCustomer(customers.get(0).getId())
            .setReturnUrl("http://localhost:5173/perfil") // Adjust as needed
            .build();

        return com.stripe.model.billingportal.Session.create(params).getUrl();
    }
}
