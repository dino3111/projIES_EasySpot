package pt.ua.deti.apieasyspot.booking.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ReservationResponse(
    UUID reservationId,
    String bookingCode,
    UUID parkId,
    String parkName,
    String parkAddress,
    UUID spotId,
    String spotNumber,
    UUID vehicleId,
    OffsetDateTime arrivalDateTime,
    OffsetDateTime departureDateTime,
    String status,
    OffsetDateTime lockedUntil,
    BigDecimal estimatedCost
) {}
