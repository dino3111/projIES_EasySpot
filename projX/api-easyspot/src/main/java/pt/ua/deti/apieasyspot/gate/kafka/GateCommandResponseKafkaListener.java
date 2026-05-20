package pt.ua.deti.apieasyspot.gate.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import pt.ua.deti.apieasyspot.gate.dto.GateCommandResponse;

@Slf4j
@Component
@RequiredArgsConstructor
public class GateCommandResponseKafkaListener {

    private final ObjectMapper objectMapper;

    @KafkaListener(
        topics = {"${easyspot.gate.kafka.response-topic:parking-gate-responses}"},
        groupId = "${easyspot.gate.kafka.response-group-id:easyspot-gate-response}"
    )
    public void onResponse(String payload) {
        try {
            GateCommandResponse response = objectMapper.readValue(payload, GateCommandResponse.class);

            if ("EXECUTED".equals(response.result())) {
                log.info("Gate command EXECUTED: commandId={} gate={} park={} plate={} direction={}",
                    response.commandId(), response.gateId(), response.parkId(),
                    response.plate(), response.direction());
            } else {
                log.warn("Gate command DENIED: commandId={} gate={} park={} plate={} reason={}",
                    response.commandId(), response.gateId(), response.parkId(), response.plate(),
                    response.reason());
            }
        } catch (Exception ex) {
            log.warn("Invalid gate command response ignored: {}", payload, ex);
        }
    }
}
