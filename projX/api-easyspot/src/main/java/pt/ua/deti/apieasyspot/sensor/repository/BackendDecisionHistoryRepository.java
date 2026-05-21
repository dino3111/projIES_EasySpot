package pt.ua.deti.apieasyspot.sensor.repository;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pt.ua.deti.apieasyspot.sensor.dto.BackendDecisionHistoryEntry;

import java.sql.Timestamp;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

@Repository
public class BackendDecisionHistoryRepository {
    private final JdbcTemplate jdbc;

    public BackendDecisionHistoryRepository(@Qualifier("timescaleJdbcTemplate") JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void save(String entityType, String entityId, String decisionType, String decisionSource, String details, Timestamp decidedAt) {
        jdbc.update("""
            insert into backend_decision_history (id, entity_type, entity_id, decision_type, decision_source, details, decided_at)
            values (?::uuid, ?, ?, ?, ?, ?, ?)
            """,
            UUID.randomUUID().toString(), entityType, entityId, decisionType, decisionSource, details, decidedAt
        );
    }

    public List<BackendDecisionHistoryEntry> findByEntity(String entityType, String entityId) {
        return jdbc.query("""
            select entity_type, entity_id, decision_type, decision_source, details, decided_at
            from backend_decision_history
            where entity_type = ? and entity_id = ?
            order by decided_at desc
            limit 500
            """,
            (rs, n) -> new BackendDecisionHistoryEntry(
                rs.getString("entity_type"),
                rs.getString("entity_id"),
                rs.getString("decision_type"),
                rs.getString("decision_source"),
                rs.getString("details"),
                rs.getTimestamp("decided_at").toInstant().atOffset(ZoneOffset.UTC)
            ),
            entityType, entityId
        );
    }
}
