package pt.ua.deti.apieasyspot.sensor.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record SensorDetailDto(
    String sensorId,
    UUID parkingLotId,
    String parkingLotName,
    String parkingLotCity,
    String zone,
    String status,
    OffsetDateTime lastSeenAt,
    OffsetDateTime createdAt,
    List<SensorLogEntry> logs
) {}
