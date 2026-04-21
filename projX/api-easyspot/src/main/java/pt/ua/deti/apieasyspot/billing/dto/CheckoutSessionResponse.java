package pt.ua.deti.apieasyspot.billing.dto;

public record CheckoutSessionResponse(
    String sessionId,
    String sessionUrl
) {}
