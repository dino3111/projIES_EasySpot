package pt.ua.deti.apieasyspot.billing.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public record CheckoutSessionRequest(
    @NotNull UUID reservationId,
    @NotNull BigDecimal amount,
    @NotNull String currency,
    String customerEmail,
    String successUrl,
    String cancelUrl
) {}
