package pt.ua.deti.apieasyspot.sensor.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import pt.ua.deti.apieasyspot.sensor.service.SensorLogsService;

@Slf4j
@Component
@RequiredArgsConstructor
public class SensorEventKafkaListener {

    private final ObjectMapper objectMapper;
    private final SensorLogsService sensorLogsService;

    @KafkaListener(
        topics = {"${easyspot.sensor.kafka.topic:sensor-events}"},
        groupId = "${easyspot.sensor.kafka.group-id:easyspot-sensor}"
    )
    public void onEvent(String payload) {
        try {
            SensorEvent event = objectMapper.readValue(payload, SensorEvent.class);

            if (event.sensorId() == null || event.sensorId().isBlank()) {
                log.warn("Ignoring sensor event with missing sensorId");
                return;
            }

            switch (event.eventType()) {
                case "sensor.fault", "device.fault" -> {
                    sensorLogsService.faultSensor(event.sensorId());
                    log.info("Sensor fault registered: sensorId={} park={}", event.sensorId(), event.parkId());
                }
                case "sensor.recovered", "device.recovery" -> {
                    String recoveryType = extractRecoveryType(event);
                    sensorLogsService.recoverSensor(event.sensorId(), recoveryType);
                    log.info("Sensor recovered: sensorId={} type={} park={}", event.sensorId(), recoveryType, event.parkId());
                }
                default -> log.debug("Sensor event type '{}' has no dedicated handler: sensorId={}", event.eventType(), event.sensorId());
            }
        } catch (Exception ex) {
            log.warn("Invalid sensor event ignored: {}", payload, ex);
        }
    }

    private String extractRecoveryType(SensorEvent event) {
        if (event.payload() == null) return "AUTO_RECOVERY";
        Object type = event.payload().get("recoveryType");
        return type instanceof String s && !s.isBlank() ? s : "AUTO_RECOVERY";
    }
}
