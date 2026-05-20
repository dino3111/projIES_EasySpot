package pt.ua.deti.apieasyspot.sensor.kafka;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public record SensorEvent(
    UUID eventId,
    String eventType,
    UUID parkId,
    String sensorId,
    String previousStatus,
    String status,
    Instant occurredAt,
    String zone,
    Map<String, Object> payload,
    int version
) {}
