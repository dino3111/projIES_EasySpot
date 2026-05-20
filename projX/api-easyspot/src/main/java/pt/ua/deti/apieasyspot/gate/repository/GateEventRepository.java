package pt.ua.deti.apieasyspot.gate.repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pt.ua.deti.apieasyspot.gate.kafka.GateEvent;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Repository
public class GateEventRepository {

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    public GateEventRepository(
        @Qualifier("timescaleJdbcTemplate") JdbcTemplate jdbc,
        ObjectMapper objectMapper
    ) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    public void save(GateEvent event) {
        UUID id = event.eventId() != null ? event.eventId() : UUID.randomUUID();
        Instant occurredAt = event.occurredAt() != null ? event.occurredAt() : Instant.now();
        String extraJson = toJson(event.extra());

        jdbc.update("""
            insert into gate_events (id, park_id, gate_id, direction, event_type, state, previous_state,
                plate, reason, occurred_at, extra)
            values (?::uuid, ?::uuid, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb)
            on conflict (id, occurred_at) do nothing
            """,
            id.toString(),
            event.parkId().toString(),
            event.gateId(),
            event.direction(),
            event.eventType(),
            event.state(),
            event.previousState() != null ? event.previousState() : "",
            event.plate(),
            event.reason() != null ? event.reason() : "",
            Timestamp.from(occurredAt),
            extraJson
        );
    }

    private String toJson(Map<String, Object> map) {
        if (map == null || map.isEmpty()) return "{}";
        try {
            return objectMapper.writeValueAsString(map);
        } catch (JsonProcessingException ex) {
            log.warn("Failed to serialize gate event extra payload", ex);
            return "{}";
        }
    }
}
