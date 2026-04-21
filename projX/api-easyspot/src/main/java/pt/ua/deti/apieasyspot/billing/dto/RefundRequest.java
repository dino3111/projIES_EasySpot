package pt.ua.deti.apieasyspot.billing.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.util.UUID;

public record RefundRequest(
    @NotNull UUID reservationId,
    @Positive BigDecimal amount,
    String reason
) {}
