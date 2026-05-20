package pt.ua.deti.apieasyspot.gate.repository;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pt.ua.deti.apieasyspot.gate.kafka.GateEvent;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;

@Slf4j
@Repository
public class GateEventRepository {

    private final JdbcTemplate jdbc;

    public GateEventRepository(@Qualifier("timescaleJdbcTemplate") JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void save(GateEvent event) {
        UUID id = event.eventId() != null ? event.eventId() : UUID.randomUUID();
        Instant occurredAt = event.occurredAt() != null ? event.occurredAt() : Instant.now();
        GateEvent.Payload p = event.payload();

        jdbc.update("""
            insert into gate_events (id, park_id, gate_id, direction, event_type, state, previous_state,
                plate, reason, occurred_at)
            values (?::uuid, ?::uuid, ?, ?, ?, ?, ?, ?, ?, ?)
            on conflict (id, occurred_at) do nothing
            """,
            id.toString(),
            event.parkId(),
            p.gateId(),
            p.direction(),
            event.eventType(),
            p.state(),
            p.previousState() != null ? p.previousState() : "",
            p.plate(),
            p.reason() != null ? p.reason() : "",
            Timestamp.from(occurredAt)
        );
    }
}
