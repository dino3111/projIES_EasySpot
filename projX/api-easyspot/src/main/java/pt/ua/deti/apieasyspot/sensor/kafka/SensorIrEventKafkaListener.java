package pt.ua.deti.apieasyspot.sensor.kafka;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import pt.ua.deti.apieasyspot.sensor.service.SensorLogsService;

@Slf4j
@Component
@RequiredArgsConstructor
public class SensorIrEventKafkaListener {

    private final ObjectMapper objectMapper;
    private final SensorLogsService sensorLogsService;

    @KafkaListener(
        topics = {"${easyspot.ir-sensor.kafka.topic:parking-ir-events}"},
        groupId = "${easyspot.ir-sensor.kafka.group-id:easyspot-ir-sensors}"
    )
    public void onEvent(String payload) {
        try {
            JsonNode root = objectMapper.readTree(payload);
            String sensorId = root.path("sensorId").asText(null);

            if (sensorId == null || sensorId.isBlank()) {
                log.warn("IR sensor event missing sensorId — ignored");
                return;
            }

            sensorLogsService.touchSensor(sensorId);

            log.debug("IR sensor event received: sensorId={} type={}",
                sensorId, root.path("eventType").asText("unknown"));

        } catch (Exception ex) {
            log.warn("Invalid IR sensor event ignored: {}", payload, ex);
        }
    }
}
