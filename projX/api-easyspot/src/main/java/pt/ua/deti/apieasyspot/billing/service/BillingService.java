package pt.ua.deti.apieasyspot.billing.service;

import com.stripe.exception.StripeException;
import com.stripe.model.Customer;
import com.stripe.model.PaymentIntent;
import com.stripe.model.PaymentMethod;
import com.stripe.model.PaymentMethodCollection;
import com.stripe.model.Refund;
import com.stripe.net.RequestOptions;
import com.stripe.param.PaymentIntentCreateParams;
import com.stripe.param.RefundCreateParams;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import pt.ua.deti.apieasyspot.billing.exception.PaymentSetupRequiredException;
import pt.ua.deti.apieasyspot.billing.model.PaymentRecord;
import pt.ua.deti.apieasyspot.billing.model.PaymentStatus;
import pt.ua.deti.apieasyspot.billing.model.ParkingSession;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.billing.repository.PaymentRecordRepository;
import pt.ua.deti.apieasyspot.billing.repository.TimescaleParkingSessionRepository;
import pt.ua.deti.apieasyspot.booking.model.Reservation;
import pt.ua.deti.apieasyspot.occupancy.model.Tariff;
import pt.ua.deti.apieasyspot.occupancy.model.ZoneType;
import pt.ua.deti.apieasyspot.occupancy.repository.TariffRepository;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class BillingService {

    private final TimescaleParkingSessionRepository parkingSessionRepository;
    private final PaymentRecordRepository paymentRecordRepository;
    private final UserRepository userRepository;
    private final TariffRepository tariffRepository;

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
        session.setId(reservation.getId());
        session.setReservationId(reservation.getId());
        if (reservation.getUser() != null) {
            session.setUserId(reservation.getUser().getId());
        }
        session.setParkingLotId(reservation.getParkingLot().getId());
        if (reservation.getVehicle() != null) session.setVehicleId(reservation.getVehicle().getId());
        session.setZoneType(zone);
        session.setEntryTime(entry);
        session.setExitTime(exit);
        session.setRevenueEuros(reservation.getEstimatedCost());

        parkingSessionRepository.save(session);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void registerReservationEntry(Reservation reservation, OffsetDateTime actualEntry) {
        if (reservation == null || actualEntry == null) {
            return;
        }
        ZoneType zone = reservation.getParkingSpot() != null
            ? reservation.getParkingSpot().getZone()
            : ZoneType.STANDARD;
        OffsetDateTime entryUtc = actualEntry.withOffsetSameInstant(ZoneOffset.UTC);
        parkingSessionRepository.updateEntryByReservationId(reservation.getId(), entryUtc, zone);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public PaymentAdjustmentResult settleReservationOnExit(
        Reservation reservation,
        OffsetDateTime actualExit,
        String customerEmail
    ) {
        if (reservation == null || actualExit == null) {
            return new PaymentAdjustmentResult(BigDecimal.ZERO, "NO_CHANGE", null, null);
        }

        OffsetDateTime actualExitUtc = actualExit.withOffsetSameInstant(ZoneOffset.UTC);
        OffsetDateTime plannedDeparture = reservation.getDepartureTime().withOffsetSameInstant(ZoneOffset.UTC);
        BigDecimal estimated = reservation.getEstimatedCost() != null
            ? reservation.getEstimatedCost()
            : BigDecimal.ZERO;

        PaymentAdjustmentResult result = new PaymentAdjustmentResult(BigDecimal.ZERO, "NO_CHANGE", null, null);
        BigDecimal finalRevenue = estimated;

        if (actualExitUtc.isAfter(plannedDeparture)) {
            ZoneType zone = reservation.getParkingSpot() != null
                ? reservation.getParkingSpot().getZone()
                : ZoneType.STANDARD;
            BigDecimal actualCost = calculateCost(
                reservation.getParkingLot().getId(),
                reservation.getArrivalTime().withOffsetSameInstant(ZoneOffset.UTC),
                actualExitUtc,
                zone
            );
            if (actualCost.compareTo(estimated) > 0) {
                result = adjustPaymentForReservation(reservation, estimated, actualCost, customerEmail);
                finalRevenue = actualCost;
            }
        }

        parkingSessionRepository.updateExitAndRevenueByReservationId(reservation.getId(), actualExitUtc, finalRevenue);
        return result;
    }

    private BigDecimal calculateCost(UUID parkingLotId, OffsetDateTime entry, OffsetDateTime exit, ZoneType zoneType) {
        if (parkingLotId == null || entry == null || exit == null || !exit.isAfter(entry)) {
            return BigDecimal.ZERO;
        }
        List<Tariff> tariffs = tariffRepository.findByParkingLotId(parkingLotId);
        if (tariffs.isEmpty()) {
            return BigDecimal.ZERO;
        }
        Tariff tariff = tariffs.stream()
            .filter(t -> t.getStatus() == pt.ua.deti.apieasyspot.occupancy.model.TariffStatus.ACTIVE)
            .filter(t -> t.getPricePerHour() != null)
            .filter(t -> isTariffCompatibleWithZone(t, zoneType))
            .findFirst()
            .orElseGet(() -> tariffs.stream()
                .filter(t -> t.getStatus() == pt.ua.deti.apieasyspot.occupancy.model.TariffStatus.ACTIVE)
                .filter(t -> t.getPricePerHour() != null)
                .findFirst()
                .orElse(null));
        if (tariff == null || tariff.getPricePerHour() == null) {
            return BigDecimal.ZERO;
        }
        if (tariff.getMaxDaily() == null) {
            long minutes = Duration.between(entry, exit).toMinutes();
            BigDecimal hours = BigDecimal.valueOf(minutes).divide(BigDecimal.valueOf(60), 4, RoundingMode.HALF_UP);
            return tariff.getPricePerHour().multiply(hours).setScale(2, RoundingMode.HALF_UP);
        }

        // Apply maxDaily cap per calendar day so multi-day stays are priced correctly
        BigDecimal total = BigDecimal.ZERO;
        OffsetDateTime cursor = entry;
        while (cursor.isBefore(exit)) {
            OffsetDateTime endOfDay = cursor.toLocalDate().atStartOfDay(cursor.getOffset()).toOffsetDateTime().plusDays(1);
            OffsetDateTime segmentEnd = endOfDay.isBefore(exit) ? endOfDay : exit;
            long segmentMinutes = Duration.between(cursor, segmentEnd).toMinutes();
            BigDecimal segmentHours = BigDecimal.valueOf(segmentMinutes).divide(BigDecimal.valueOf(60), 4, RoundingMode.HALF_UP);
            BigDecimal segmentCost = tariff.getPricePerHour().multiply(segmentHours).setScale(2, RoundingMode.HALF_UP);
            if (segmentCost.compareTo(tariff.getMaxDaily()) > 0) {
                segmentCost = tariff.getMaxDaily();
            }
            total = total.add(segmentCost);
            cursor = segmentEnd;
        }
        return total.setScale(2, RoundingMode.HALF_UP);
    }

    private boolean isTariffCompatibleWithZone(Tariff tariff, ZoneType zoneType) {
        if (tariff == null || zoneType == null || tariff.getName() == null) {
            return true;
        }
        String name = tariff.getName().toLowerCase();
        return switch (zoneType) {
            case EV -> name.contains("ev");
            case ACCESSIBLE -> name.contains("accessible");
            default -> !(name.contains("ev") || name.contains("accessible"));
        };
    }

    /**
     * Adjusts the Stripe payment for an existing reservation after its cost changed.
     * Charges the positive delta, or refunds the negative delta against the latest intent.
     * Runs in REQUIRES_NEW so a transient Stripe failure does not roll back the reservation update.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public PaymentAdjustmentResult adjustPaymentForReservation(Reservation reservation,
                                                               java.math.BigDecimal previousCost,
                                                               java.math.BigDecimal newCost,
                                                               String customerEmail) {
        java.math.BigDecimal previous = previousCost != null ? previousCost : java.math.BigDecimal.ZERO;
        java.math.BigDecimal next     = newCost != null     ? newCost     : java.math.BigDecimal.ZERO;
        java.math.BigDecimal delta    = next.subtract(previous).setScale(2, java.math.RoundingMode.HALF_UP);

        if (delta.signum() == 0) {
            return new PaymentAdjustmentResult(delta, "NO_CHANGE", null, null);
        }

        if (stripeSecretKey == null || stripeSecretKey.isBlank()) {
            throw new PaymentSetupRequiredException(
                "O Stripe não está configurado para ajustar a reserva " + reservation.getBookingCode() + ".");
        }

        if (delta.signum() > 0) {
            return chargeDelta(reservation, delta, customerEmail);
        }
        return refundDelta(reservation, delta.abs(), customerEmail);
    }

    private PaymentAdjustmentResult chargeDelta(Reservation reservation, java.math.BigDecimal delta, String customerEmail) {
        try {
            long amountCents = delta.multiply(java.math.BigDecimal.valueOf(100)).longValueExact();

            StripeCustomerContext customerContext = resolveCustomerContext(reservation, customerEmail);
            if (customerContext == null || !StringUtils.hasText(customerContext.paymentMethodId())) {
                throw new PaymentSetupRequiredException(
                    "Não foi encontrado um método de pagamento Stripe para cobrar a diferença da reserva "
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
                .putMetadata("kind", "update-delta")
                .build();

            RequestOptions options = RequestOptions.builder()
                .setIdempotencyKey(buildUpdateIdempotencyKey(reservation, delta, customerContext))
                .setApiKey(stripeSecretKey)
                .build();

            PaymentIntent intent = PaymentIntent.create(params, options);
            String intentStatus = String.valueOf(intent.getStatus());
            PaymentStatus status = switch (intentStatus) {
                case "succeeded" -> PaymentStatus.COMPLETED;
                case "requires_payment_method", "canceled" -> PaymentStatus.FAILED;
                default -> PaymentStatus.PENDING;
            };

            persistDeltaPaymentRecord(reservation, customerEmail, intent.getId(), delta, status);
            String kind = status == PaymentStatus.COMPLETED ? "CHARGED" : "CHARGE_PENDING";
            log.info("Stripe delta charge {} for reservation {} amount {} ({})",
                intent.getId(), reservation.getBookingCode(), delta, intentStatus);
            return new PaymentAdjustmentResult(delta, kind, intent.getId(), status.name());

        } catch (StripeException ex) {
            log.warn("Stripe delta charge failed for reservation {} amount {}: {}",
                reservation.getBookingCode(), delta, ex.getMessage());
            persistDeltaPaymentRecord(reservation, customerEmail, null, delta, PaymentStatus.FAILED);
            return new PaymentAdjustmentResult(delta, "CHARGE_FAILED", null, describeStripeFailure(ex));
        }
    }

    private PaymentAdjustmentResult refundDelta(Reservation reservation, java.math.BigDecimal amount, String customerEmail) {
        Optional<PaymentRecord> latestSuccessful = paymentRecordRepository
            .findTopByReservationIdAndPaymentIntentIdIsNotNullAndAmountGreaterThanAndStatusInOrderByCreatedAtDesc(
                reservation.getId(),
                BigDecimal.ZERO,
                List.of(PaymentStatus.COMPLETED, PaymentStatus.PENDING)
            );

        if (latestSuccessful.isEmpty()) {
            log.warn("Cannot refund reservation {}: no prior PaymentIntent found", reservation.getBookingCode());
            persistDeltaPaymentRecord(reservation, customerEmail, null, amount.negate(), PaymentStatus.FAILED);
            return new PaymentAdjustmentResult(amount.negate(), "REFUND_FAILED", null, PaymentStatus.FAILED.name());
        }

        PaymentRecord previousRecord = latestSuccessful.get();
        try {
            long amountCents = amount.multiply(java.math.BigDecimal.valueOf(100)).longValueExact();
            RefundCreateParams params = RefundCreateParams.builder()
                .setPaymentIntent(previousRecord.getPaymentIntentId())
                .setAmount(amountCents)
                .putMetadata("reservationId", reservation.getId().toString())
                .putMetadata("bookingCode", reservation.getBookingCode())
                .putMetadata("kind", "update-delta")
                .build();
            Refund refund = Refund.create(params, getRequestOptions());

            PaymentStatus newStatus = "succeeded".equals(refund.getStatus())
                ? PaymentStatus.PARTIALLY_REFUNDED
                : PaymentStatus.PENDING;
            String kind = "succeeded".equals(refund.getStatus()) ? "REFUNDED" : "REFUND_PENDING";

            persistDeltaPaymentRecord(reservation, customerEmail, null, amount.negate(), newStatus);
            log.info("Stripe refund {} for reservation {} amount {} ({})",
                refund.getId(), reservation.getBookingCode(), amount, refund.getStatus());
            return new PaymentAdjustmentResult(amount.negate(), kind, refund.getId(), newStatus.name());

        } catch (StripeException ex) {
            log.warn("Stripe refund failed for reservation {} amount {}: {}",
                reservation.getBookingCode(), amount, ex.getMessage());
            persistDeltaPaymentRecord(reservation, customerEmail, null, amount.negate(), PaymentStatus.FAILED);
            return new PaymentAdjustmentResult(amount.negate(), "REFUND_FAILED", null, describeStripeFailure(ex));
        }
    }

    private String describeStripeFailure(StripeException ex) {
        if (ex == null) {
            return PaymentStatus.FAILED.name();
        }
        if (StringUtils.hasText(ex.getCode())) {
            return ex.getCode();
        }
        return PaymentStatus.FAILED.name();
    }

    private String buildUpdateIdempotencyKey(Reservation reservation,
                                             java.math.BigDecimal delta,
                                             StripeCustomerContext customerContext) {
        String fingerprint = String.join("|",
            reservation.getId().toString(),
            delta.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString(),
            reservation.getArrivalTime() != null ? reservation.getArrivalTime().toString() : "",
            reservation.getDepartureTime() != null ? reservation.getDepartureTime().toString() : "",
            reservation.getParkingSpot() != null ? reservation.getParkingSpot().getId().toString() : "auto",
            customerContext != null ? Objects.toString(customerContext.customerId(), "") : "",
            customerContext != null ? Objects.toString(customerContext.paymentMethodId(), "") : ""
        );
        return "reservation-update-" + Integer.toHexString(fingerprint.hashCode());
    }

    private void persistDeltaPaymentRecord(Reservation reservation, String customerEmail, String paymentIntentId,
                                           java.math.BigDecimal amount, PaymentStatus status) {
        PaymentRecord record = new PaymentRecord();
        record.setReservationId(reservation.getId());
        record.setPaymentIntentId(paymentIntentId);
        record.setAmount(amount);
        record.setCurrency("eur");
        record.setStatus(status);
        record.setCustomerEmail(customerEmail);
        paymentRecordRepository.save(record);
    }

    /**
     * Refunds the most recent successful PaymentIntent for a reservation.
     * Returns the actually refunded amount (always non-negative) and a status flag.
     * Runs in REQUIRES_NEW so a transient Stripe failure does not roll back the reservation cancel.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public RefundResult refundReservation(Reservation reservation, String customerEmail) {
        Optional<PaymentRecord> existingRefund = paymentRecordRepository
            .findTopByReservationIdAndAmountLessThanAndStatusInOrderByCreatedAtDesc(
                reservation.getId(),
                BigDecimal.ZERO,
                List.of(PaymentStatus.REFUNDED, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.PENDING)
            );

        if (existingRefund.isPresent()) {
            BigDecimal amount = existingRefund.get().getAmount().abs();
            boolean succeeded = existingRefund.get().getStatus() == PaymentStatus.REFUNDED
                || existingRefund.get().getStatus() == PaymentStatus.PARTIALLY_REFUNDED;
            log.info("Skipping duplicate cancellation refund for reservation {} (already recorded as {})",
                reservation.getBookingCode(), existingRefund.get().getStatus());
            return new RefundResult(
                amount,
                succeeded,
                succeeded ? "ALREADY_REFUNDED" : "REFUND_PENDING",
                existingRefund.get().getPaymentIntentId()
            );
        }

        Optional<PaymentRecord> chargeableRecord = paymentRecordRepository
            .findTopByReservationIdAndPaymentIntentIdIsNotNullAndAmountGreaterThanAndStatusInOrderByCreatedAtDesc(
                reservation.getId(),
                BigDecimal.ZERO,
                List.of(PaymentStatus.COMPLETED, PaymentStatus.PENDING)
            );

        if (chargeableRecord.isEmpty()) {
            log.info("No refundable PaymentIntent for reservation {}", reservation.getBookingCode());
            return new RefundResult(java.math.BigDecimal.ZERO, false, "NO_CHARGE", null);
        }

        if (stripeSecretKey == null || stripeSecretKey.isBlank()) {
            log.warn("Cannot refund reservation {}: Stripe not configured", reservation.getBookingCode());
            return new RefundResult(chargeableRecord.get().getAmount(), false, "STRIPE_NOT_CONFIGURED", null);
        }

        PaymentRecord record = chargeableRecord.get();
        java.math.BigDecimal amount = record.getAmount();
        try {
            long amountCents = amount.multiply(java.math.BigDecimal.valueOf(100)).longValueExact();
            RefundCreateParams params = RefundCreateParams.builder()
                .setPaymentIntent(record.getPaymentIntentId())
                .setAmount(amountCents)
                .putMetadata("reservationId", reservation.getId().toString())
                .putMetadata("bookingCode", reservation.getBookingCode())
                .putMetadata("kind", "cancellation")
                .build();
            Refund refund = Refund.create(params, getRequestOptions());

            boolean succeeded = "succeeded".equals(refund.getStatus());
            PaymentStatus status = succeeded ? PaymentStatus.REFUNDED : PaymentStatus.PENDING;
            persistDeltaPaymentRecord(reservation, customerEmail, null, amount.negate(), status);
            log.info("Stripe cancellation refund {} for reservation {} amount {} ({})",
                refund.getId(), reservation.getBookingCode(), amount, refund.getStatus());
            return new RefundResult(amount, succeeded, succeeded ? "REFUNDED" : "REFUND_PENDING", refund.getId());

        } catch (StripeException ex) {
            log.warn("Stripe refund failed for cancellation of reservation {}: {}",
                reservation.getBookingCode(), ex.getMessage());
            if ("charge_already_refunded".equalsIgnoreCase(ex.getCode())) {
                persistDeltaPaymentRecord(reservation, customerEmail, null, amount.negate(), PaymentStatus.REFUNDED);
                return new RefundResult(amount, true, "ALREADY_REFUNDED", null);
            }
            persistDeltaPaymentRecord(reservation, customerEmail, null, amount.negate(), PaymentStatus.FAILED);
            return new RefundResult(amount, false, "REFUND_FAILED", null);
        }
    }

    public record RefundResult(java.math.BigDecimal amount, boolean succeeded, String kind, String stripeReferenceId) {}

    public record PaymentAdjustmentResult(java.math.BigDecimal delta, String kind, String stripeReferenceId, String status) {}

    private record StripeCustomerContext(String customerId, String paymentMethodId) {}
}
