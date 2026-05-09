package pt.ua.deti.apieasyspot.sensor.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record SensorSummaryDto(
    String sensorId,
    UUID parkingLotId,
    String parkingLotName,
    String zone,
    String status,
    OffsetDateTime lastSeenAt,
    OffsetDateTime createdAt
) {}
