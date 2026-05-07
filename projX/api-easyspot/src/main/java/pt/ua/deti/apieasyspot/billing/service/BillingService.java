package pt.ua.deti.apieasyspot.billing.service;

import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.net.RequestOptions;
import com.stripe.param.PaymentIntentCreateParams;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import pt.ua.deti.apieasyspot.billing.model.ParkingSession;
import pt.ua.deti.apieasyspot.billing.repository.TimescaleParkingSessionRepository;
import pt.ua.deti.apieasyspot.booking.model.Reservation;
import pt.ua.deti.apieasyspot.occupancy.model.ZoneType;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Slf4j
@Service
@RequiredArgsConstructor
public class BillingService {

    private final TimescaleParkingSessionRepository parkingSessionRepository;

    @Value("${stripe.secret-key:}")
    private String stripeSecretKey;

    /**
     * Creates a Stripe PaymentIntent for pre-authorization and persists a ParkingSession record.
     * Fails gracefully: a Stripe error never rolls back the reservation itself.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public String createPaymentIntentForReservation(Reservation reservation) {
        String stripeIntentId = createStripePaymentIntent(reservation);
        persistParkingSession(reservation);
        return stripeIntentId;
    }

    private String createStripePaymentIntent(Reservation reservation) {
        if (stripeSecretKey == null || stripeSecretKey.isBlank()) {
            log.warn("Stripe secret key not configured — skipping PaymentIntent creation for reservation {}",
                reservation.getBookingCode());
            return null;
        }
        try {
            long amountCents = reservation.getEstimatedCost() != null
                ? reservation.getEstimatedCost().multiply(java.math.BigDecimal.valueOf(100)).longValue()
                : 0L;

            PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                .setAmount(amountCents)
                .setCurrency("eur")
                .setCaptureMethod(PaymentIntentCreateParams.CaptureMethod.MANUAL)
                .putMetadata("reservationId", reservation.getId().toString())
                .putMetadata("bookingCode", reservation.getBookingCode())
                .build();

            RequestOptions options = RequestOptions.builder()
                .setApiKey(stripeSecretKey)
                .build();

            PaymentIntent intent = PaymentIntent.create(params, options);
            log.info("Stripe PaymentIntent {} created for reservation {}", intent.getId(), reservation.getBookingCode());
            return intent.getId();

        } catch (StripeException ex) {
            log.warn("Stripe PaymentIntent creation failed for reservation {} (reservation still confirmed): {}",
                reservation.getBookingCode(), ex.getMessage());
            return null;
        }
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
}
