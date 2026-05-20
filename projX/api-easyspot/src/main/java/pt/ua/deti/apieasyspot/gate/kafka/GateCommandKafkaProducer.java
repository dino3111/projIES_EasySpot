package pt.ua.deti.apieasyspot.gate.kafka;

import com.fasterxml.jackson.core.JacksonException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import pt.ua.deti.apieasyspot.gate.dto.GateCommand;

@Slf4j
@Component
public class GateCommandKafkaProducer {

    @Value("${easyspot.gate.kafka.command-topic:parking-gate-commands}")
    private String commandTopic;

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public GateCommandKafkaProducer(
        @Autowired(required = false) KafkaTemplate<String, String> kafkaTemplate,
        ObjectMapper objectMapper
    ) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
    }

    public void send(GateCommand command) {
        if (kafkaTemplate == null) {
            log.debug("Kafka not configured — skipping gate command {} for park {}",
                command.commandType(), command.parkId());
            return;
        }

        try {
            String json = objectMapper.writeValueAsString(command);
            kafkaTemplate.send(commandTopic, command.parkId().toString(), json)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.warn("Failed to publish gate command {}: {}", command.commandId(), ex.getMessage());
                    } else {
                        log.info("Gate command published: type={} park={} gate={} plate={} reservation={}",
                            command.commandType(), command.parkId(), command.gateId(),
                            command.plate(), command.reservationId());
                    }
                });
        } catch (JacksonException ex) {
            log.warn("Failed to serialize gate command {}: {}", command.commandId(), ex.getMessage());
        }
    }
}
