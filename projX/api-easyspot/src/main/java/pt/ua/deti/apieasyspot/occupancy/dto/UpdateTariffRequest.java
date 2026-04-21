package pt.ua.deti.apieasyspot.occupancy.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import pt.ua.deti.apieasyspot.occupancy.model.TariffStatus;

import java.math.BigDecimal;
import java.util.UUID;

public record UpdateTariffRequest(
    @NotNull
    UUID parkId,

    @NotNull
    @DecimalMin("0.0")
    @Digits(integer = 10, fraction = 2)
    BigDecimal pricePerHour,

    @NotNull
    @DecimalMin("0.0")
    @Digits(integer = 10, fraction = 2)
    BigDecimal maxDaily,

    @NotNull
    @DecimalMin("0.0")
    @Digits(integer = 10, fraction = 2)
    BigDecimal monthlyPrice,

    @NotNull
    @DecimalMin("0.0")
    @Digits(integer = 10, fraction = 2)
    BigDecimal pricePerKwh,

    @NotNull
    TariffStatus status
) {}
