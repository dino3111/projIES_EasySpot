package pt.ua.deti.apieasyspot.booking.dto;

import java.math.BigDecimal;

/**
 * Preview of a reservation update: shows the new cost and the delta against the current cost
 * without persisting changes or charging Stripe.
 */
public record ReservationUpdatePreviewResponse(
    BigDecimal previousCost,
    BigDecimal newCost,
    BigDecimal costDelta
) {}
