package pt.ua.deti.apieasyspot.billing.service;

import com.stripe.exception.StripeException;
import com.stripe.model.Customer;
import com.stripe.model.PaymentIntent;
import com.stripe.model.PaymentMethod;
import com.stripe.model.PaymentMethodCollection;
import com.stripe.net.RequestOptions;
import com.stripe.param.PaymentIntentCreateParams;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import jakarta.annotation.PostConstruct;
import pt.ua.deti.apieasyspot.billing.exception.PaymentSetupRequiredException;
import pt.ua.deti.apieasyspot.billing.model.PaymentRecord;
import pt.ua.deti.apieasyspot.billing.model.PaymentStatus;
import pt.ua.deti.apieasyspot.billing.model.ParkingSession;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.billing.repository.PaymentRecordRepository;
import pt.ua.deti.apieasyspot.billing.repository.TimescaleParkingSessionRepository;
import pt.ua.deti.apieasyspot.booking.model.Reservation;
import pt.ua.deti.apieasyspot.occupancy.model.ZoneType;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class BillingService {

    private final TimescaleParkingSessionRepository parkingSessionRepository;
    private final PaymentRecordRepository paymentRecordRepository;
    private final UserRepository userRepository;

    @Value("${stripe.api.key:}")
    private String stripeSecretKey;

    private RequestOptions getRequestOptions() {
        return RequestOptions.builder()
            .setApiKey(stripeSecretKey)
            .build();
    }

    /**
     * Creates a Stripe PaymentIntent for the reservation deposit and persists payment/session records.
     * Fails gracefully: a Stripe error never rolls back the reservation itself.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public String createPaymentIntentForReservation(Reservation reservation, String customerEmail) {
        String stripeIntentId = createStripePaymentIntent(reservation, customerEmail);
        persistParkingSession(reservation);
        return stripeIntentId;
    }

    private String createStripePaymentIntent(Reservation reservation, String customerEmail) {
        if (stripeSecretKey == null || stripeSecretKey.isBlank()) {
            throw new PaymentSetupRequiredException(
                "O Stripe não está configurado para a reserva " + reservation.getBookingCode() + ".");
        }
        try {
            long amountCents = reservation.getEstimatedCost() != null
                ? reservation.getEstimatedCost().multiply(java.math.BigDecimal.valueOf(100)).longValueExact()
                : 0L;

            if (amountCents <= 0L) {
                log.info("Reservation {} has no chargeable amount; skipping Stripe payment creation",
                    reservation.getBookingCode());
                persistPendingPaymentRecord(reservation, customerEmail, null);
                return null;
            }

            StripeCustomerContext customerContext = resolveCustomerContext(reservation, customerEmail);
            if (customerContext == null || !StringUtils.hasText(customerContext.paymentMethodId())) {
                throw new PaymentSetupRequiredException(
                    "Não foi encontrado um método de pagamento Stripe guardado para a reserva "
                        + reservation.getBookingCode() + ".");
            }

            PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                .setAmount(amountCents)
                .setCurrency("eur")
                .setCustomer(customerContext.customerId())
                .setPaymentMethod(customerContext.paymentMethodId())
                .setConfirm(true)
                .setOffSession(true)
                .putMetadata("reservationId", reservation.getId().toString())
                .putMetadata("bookingCode", reservation.getBookingCode())
                .build();

            RequestOptions options = RequestOptions.builder()
                .setIdempotencyKey("reservation-payment-" + reservation.getId())
                .setApiKey(stripeSecretKey)
                .build();

            PaymentIntent intent = PaymentIntent.create(params, options);

            String intentStatus = String.valueOf(intent.getStatus());
            PaymentStatus status = switch (intentStatus) {
                case "succeeded" -> PaymentStatus.COMPLETED;
                case "requires_payment_method", "canceled" -> PaymentStatus.FAILED;
                default -> PaymentStatus.PENDING;
            };

            persistPaymentRecord(reservation, customerEmail, intent.getId(), status);
            log.info(
                "Stripe PaymentIntent {} created for reservation {} with status {}",
                intent.getId(),
                reservation.getBookingCode(),
                intentStatus
            );
            return intent.getId();

        } catch (StripeException ex) {
            log.warn("Stripe PaymentIntent creation failed for reservation {} (reservation still confirmed): {}",
                reservation.getBookingCode(), ex.getMessage());
            persistPendingPaymentRecord(reservation, customerEmail, null);
            return null;
        }
    }

    private StripeCustomerContext resolveCustomerContext(Reservation reservation, String customerEmail) throws StripeException {
        String storedCustomerId = null;
        if (reservation.getUser() != null && StringUtils.hasText(reservation.getUser().getStripeCustomerId())) {
            storedCustomerId = reservation.getUser().getStripeCustomerId();
        }
        if (!StringUtils.hasText(storedCustomerId) && StringUtils.hasText(customerEmail)) {
            storedCustomerId = userRepository.findByEmail(customerEmail)
                .map(User::getStripeCustomerId)
                .filter(StringUtils::hasText)
                .orElse(null);
        }
        if (StringUtils.hasText(storedCustomerId)) {
            PaymentMethodCollection paymentMethods = PaymentMethod.list(
                com.stripe.param.PaymentMethodListParams.builder()
                    .setCustomer(storedCustomerId)
                    .setType(com.stripe.param.PaymentMethodListParams.Type.CARD)
                    .setLimit(1L)
                    .build(),
                getRequestOptions()
            );
            Optional<PaymentMethod> firstMethod = paymentMethods.getData().stream().findFirst();
            String paymentMethodId = firstMethod.map(PaymentMethod::getId).orElse(null);
            return new StripeCustomerContext(storedCustomerId, paymentMethodId);
        }

        if (!StringUtils.hasText(customerEmail)) {
            return null;
        }

        com.stripe.param.CustomerListParams listParams = com.stripe.param.CustomerListParams.builder()
            .setEmail(customerEmail)
            .setLimit(1L)
            .build();
        List<Customer> customers = Customer.list(listParams, getRequestOptions()).getData();
        if (customers.isEmpty()) {
            return null;
        }

        Customer customer = customers.get(0);
        String customerId = customer.getId();
        userRepository.findByEmail(customerEmail).ifPresent(user -> {
            if (!customerId.equals(user.getStripeCustomerId())) {
                user.setStripeCustomerId(customerId);
                userRepository.save(user);
            }
        });
        String defaultPaymentMethodId = customer.getInvoiceSettings() != null
            ? customer.getInvoiceSettings().getDefaultPaymentMethod()
            : null;

        if (!StringUtils.hasText(defaultPaymentMethodId)) {
            PaymentMethodCollection paymentMethods = PaymentMethod.list(
                com.stripe.param.PaymentMethodListParams.builder()
                    .setCustomer(customerId)
                    .setType(com.stripe.param.PaymentMethodListParams.Type.CARD)
                    .setLimit(1L)
                    .build(),
                getRequestOptions()
            );

            Optional<PaymentMethod> firstMethod = paymentMethods.getData().stream().findFirst();
            defaultPaymentMethodId = firstMethod.map(PaymentMethod::getId).orElse(null);
        }

        return new StripeCustomerContext(customerId, defaultPaymentMethodId);
    }

    private void persistPendingPaymentRecord(Reservation reservation, String customerEmail, String paymentIntentId) {
        persistPaymentRecord(reservation, customerEmail, paymentIntentId, PaymentStatus.PENDING);
    }

    private void persistPaymentRecord(Reservation reservation, String customerEmail, String paymentIntentId, PaymentStatus status) {
        PaymentRecord paymentRecord = paymentRecordRepository
            .findTopByReservationIdOrderByCreatedAtDesc(reservation.getId())
            .orElseGet(PaymentRecord::new);

        paymentRecord.setReservationId(reservation.getId());
        paymentRecord.setPaymentIntentId(paymentIntentId);
        paymentRecord.setAmount(reservation.getEstimatedCost() != null ? reservation.getEstimatedCost() : java.math.BigDecimal.ZERO);
        paymentRecord.setCurrency("eur");
        paymentRecord.setStatus(status);
        paymentRecord.setCustomerEmail(customerEmail);

        paymentRecordRepository.save(paymentRecord);
    }

    private void persistParkingSession(Reservation reservation) {
        ZoneType zone = reservation.getParkingSpot() != null
            ? reservation.getParkingSpot().getZone()
            : ZoneType.STANDARD;

        OffsetDateTime entry = reservation.getArrivalTime().withOffsetSameInstant(ZoneOffset.UTC);
        OffsetDateTime exit  = reservation.getDepartureTime().withOffsetSameInstant(ZoneOffset.UTC);

        ParkingSession session = new ParkingSession();
        if (reservation.getUser() != null) session.setUserId(reservation.getUser().getId());
        session.setParkingLotId(reservation.getParkingLot().getId());
        if (reservation.getVehicle() != null) session.setVehicleId(reservation.getVehicle().getId());
        session.setZoneType(zone);
        session.setEntryTime(entry);
        session.setExitTime(exit);
        session.setRevenueEuros(reservation.getEstimatedCost());

        parkingSessionRepository.save(session);
    }

    private record StripeCustomerContext(String customerId, String paymentMethodId) {}
}
