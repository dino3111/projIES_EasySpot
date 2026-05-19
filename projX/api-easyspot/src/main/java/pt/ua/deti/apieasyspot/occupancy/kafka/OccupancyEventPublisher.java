package pt.ua.deti.apieasyspot.occupancy.kafka;

import com.fasterxml.jackson.core.JacksonException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class OccupancyEventPublisher {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private final String topic;

    public OccupancyEventPublisher(
        @Autowired(required = false) KafkaTemplate<String, String> kafkaTemplate,
        ObjectMapper objectMapper,
        @Value("${easyspot.occupancy.kafka.topic:occupancy-events}") String topic
    ) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
        this.topic = topic;
    }

    public void publish(OccupancyEvent event) {
        if (kafkaTemplate == null) {
            log.debug("Kafka not configured — skipping occupancy event for spot {}", event.spotId());
            return;
        }

        try {
            String json = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(topic, event.spotId().toString(), json)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.warn("Failed to publish occupancy event for spot {}: {}", event.spotId(), ex.getMessage());
                    }
                });
        } catch (JacksonException ex) {
            log.warn("Failed to serialize occupancy event for spot {}: {}", event.spotId(), ex.getMessage());
        }
    }
}
