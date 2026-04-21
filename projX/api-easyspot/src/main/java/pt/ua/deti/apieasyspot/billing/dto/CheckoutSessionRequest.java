package pt.ua.deti.apieasyspot.billing.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.util.UUID;

public record CheckoutSessionRequest(
    @NotNull UUID reservationId,
    @NotNull @Positive BigDecimal amount,
    @NotBlank @Pattern(regexp = "[A-Za-z]{3}", message = "Must be a 3-letter ISO 4217 code") String currency,
    @Email String customerEmail,
    @NotBlank String successUrl,
    @NotBlank String cancelUrl
) {}
