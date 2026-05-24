package pt.ua.deti.apieasyspot.occupancy.dto;

import pt.ua.deti.apieasyspot.occupancy.model.ParkStatus;
import pt.ua.deti.apieasyspot.occupancy.model.TariffStatus;

import java.math.BigDecimal;
import java.util.UUID;

public record TariffResponse(
    UUID id,
    UUID parkId,
    String parkName,
    String city,
    BigDecimal pricePerHour,
    BigDecimal maxDaily,
    BigDecimal monthlyPrice,
    BigDecimal pricePerKwh,
    TariffStatus status,
    ParkStatus parkStatus
) {}
