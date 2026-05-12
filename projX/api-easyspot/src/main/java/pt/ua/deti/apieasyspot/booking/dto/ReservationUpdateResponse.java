package pt.ua.deti.apieasyspot.booking.dto;

import java.math.BigDecimal;

/**
 * Response returned after updating a reservation.
 * Includes the updated reservation plus the Stripe adjustment details (delta charged or refunded).
 */
public record ReservationUpdateResponse(
    ReservationResponse reservation,
    BigDecimal previousCost,
    BigDecimal newCost,
    BigDecimal costDelta,
    String paymentAdjustmentKind,
    String paymentStatus,
    String stripeReferenceId
) {}
