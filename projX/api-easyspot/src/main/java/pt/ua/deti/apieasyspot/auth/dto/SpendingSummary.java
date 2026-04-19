package pt.ua.deti.apieasyspot.auth.dto;

import java.math.BigDecimal;

public record SpendingSummary(BigDecimal totalEuros, long sessionCount, BigDecimal avgEuros) {}