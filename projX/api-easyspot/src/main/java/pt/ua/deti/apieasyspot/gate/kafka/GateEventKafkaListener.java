package pt.ua.deti.apieasyspot.gate.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import pt.ua.deti.apieasyspot.gate.repository.GateEventRepository;
import pt.ua.deti.apieasyspot.sensor.service.SensorLogsService;

@Slf4j
@Component
@RequiredArgsConstructor
public class GateEventKafkaListener {

    private final ObjectMapper objectMapper;
    private final GateEventRepository gateEventRepository;
    private final SensorLogsService sensorLogsService;

    @KafkaListener(
        topics = {"${easyspot.gate.kafka.topic:gate-events}"},
        groupId = "${easyspot.gate.kafka.group-id:easyspot-gate}"
    )
    public void onEvent(String payload) {
        try {
            GateEvent event = objectMapper.readValue(payload, GateEvent.class);

            if (event.parkId() == null || event.gateId() == null || event.gateId().isBlank()) {
                log.warn("Ignoring gate event with missing parkId or gateId");
                return;
            }

            if (event.eventType() == null) {
                log.warn("Ignoring gate event with missing eventType: gateId={}", event.gateId());
                return;
            }

            gateEventRepository.save(event);

            switch (event.eventType()) {
                case "gate.fault" -> {
                    sensorLogsService.faultSensor(event.gateId());
                    log.info("Gate fault registered: gateId={} park={}", event.gateId(), event.parkId());
                }
                case "gate.recovered" -> {
                    String reason = event.reason() != null ? event.reason() : "AUTO_RECOVERY";
                    sensorLogsService.recoverSensor(event.gateId(), reason);
                    log.info("Gate recovered: gateId={} reason={} park={}", event.gateId(), reason, event.parkId());
                }
                default -> log.debug("Gate event persisted: type={} gateId={} state={}", event.eventType(), event.gateId(), event.state());
            }
        } catch (Exception ex) {
            log.warn("Invalid gate event ignored: {}", payload, ex);
        }
    }
}
