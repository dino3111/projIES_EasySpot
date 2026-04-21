package pt.ua.deti.apieasyspot.billing.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public record RefundRequest(
    @NotNull UUID reservationId,
    BigDecimal amount, // optional for partial refunds
    String reason
) {}
