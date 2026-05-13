package pt.ua.deti.apieasyspot.billing.dto;

public record PaymentMethodSummaryResponse(
    String id,
    String type,
    String brand,
    String last4,
    Long expMonth,
    Long expYear,
    boolean isDefault
) {}
