package pt.ua.deti.apieasyspot.notification.repository;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pt.ua.deti.apieasyspot.notification.dto.AlertStateHistoryEntry;

import java.sql.Timestamp;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

@Repository
public class AlertStateHistoryRepository {
    private final JdbcTemplate jdbc;

    public AlertStateHistoryRepository(@Qualifier("timescaleJdbcTemplate") JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void save(UUID alertId, String previousState, String newState, String changedBy, String notes, Timestamp changedAt) {
        jdbc.update("""
            insert into alert_state_history (id, alert_id, previous_state, new_state, changed_by, notes, changed_at)
            values (?::uuid, ?::uuid, ?, ?, ?, ?, ?)
            """,
            UUID.randomUUID().toString(), alertId.toString(), previousState, newState, changedBy, notes, changedAt);
    }

    public List<AlertStateHistoryEntry> findByAlertId(UUID alertId) {
        return jdbc.query("""
            select previous_state, new_state, changed_by, notes, changed_at
            from alert_state_history
            where alert_id = ?::uuid
            order by changed_at desc
            limit 200
            """,
            (rs, n) -> new AlertStateHistoryEntry(
                rs.getString("previous_state"),
                rs.getString("new_state"),
                rs.getString("changed_by"),
                rs.getString("notes"),
                rs.getTimestamp("changed_at").toInstant().atOffset(ZoneOffset.UTC)
            ),
            alertId.toString()
        );
    }
}
