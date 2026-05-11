package pt.ua.deti.apieasyspot.billing.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ManagerBillingSessionResponse(
    UUID id,
    String parkName,
    OffsetDateTime entryTime,
    OffsetDateTime exitTime,
    long durationMinutes,
    String licensePlate,
    String zoneType,
    BigDecimal parkingRevenue,
    BigDecimal evRevenue,
    BigDecimal total
) {}
