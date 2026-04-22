package pt.ua.deti.apieasyspot.billing.dto;

import pt.ua.deti.apieasyspot.billing.model.PaymentStatus;
import java.math.BigDecimal;
import java.util.UUID;

public record PaymentStatusResponse(
    UUID reservationId,
    PaymentStatus status,
    BigDecimal amount,
    String currency,
    String paymentIntentId
) {}
