package pt.ua.deti.apieasyspot.notification.repository;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pt.ua.deti.apieasyspot.notification.model.Alert;
import pt.ua.deti.apieasyspot.notification.model.AlertType;
import pt.ua.deti.apieasyspot.notification.model.SeverityAlert;
import pt.ua.deti.apieasyspot.notification.model.StateAlert;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

@Repository
public class TimescaleAlertRepository {

    private final JdbcTemplate jdbc;

    public TimescaleAlertRepository(@Qualifier("timescaleJdbcTemplate") JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Alert save(Alert alert) {
        if (alert.getId() == null) {
            alert.setId(UUID.randomUUID());
        }
        jdbc.update("""
            insert into alerts (id, parking_lot_id, type, severity, state, zone, spot_number,
                sensor_id, plate, description, photo_url, attributed_to, notes, resolved_at, created_at)
            values (?::uuid, ?::uuid, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            on conflict (id) do update set
                state = excluded.state,
                severity = excluded.severity,
                attributed_to = excluded.attributed_to,
                notes = excluded.notes,
                resolved_at = excluded.resolved_at,
                photo_url = excluded.photo_url
            """,
            alert.getId().toString(),
            alert.getParkingLotId().toString(),
            alert.getType().name(),
            alert.getSeverity().name(),
            alert.getState().name(),
            alert.getZone(),
            alert.getSpotNumber(),
            alert.getSensorId(),
            alert.getPlate(),
            alert.getDescription(),
            alert.getPhotoUrl(),
            alert.getAttributedTo(),
            alert.getNotes(),
            alert.getResolvedAt() != null ? Timestamp.from(alert.getResolvedAt().toInstant()) : null,
            Timestamp.from(alert.getCreatedAt().toInstant())
        );
        return alert;
    }

    public void deleteAll() {
        jdbc.update("delete from alerts");
    }

    public long count() {
        Long result = jdbc.queryForObject("select count(*) from alerts", Long.class);
        return result != null ? result : 0L;
    }

    public java.util.List<Alert> findAll() {
        return jdbc.query("""
            select a.id, a.parking_lot_id, pl.name as parking_lot_name,
                   a.type, a.severity, a.state, a.zone, a.spot_number, a.sensor_id,
                   a.plate, a.description, a.photo_url, a.attributed_to, a.notes,
                   a.resolved_at, a.created_at
            from alerts a
            join parking_lots pl on pl.id = a.parking_lot_id
            """,
            this::mapRow
        );
    }

    public Optional<Alert> findById(UUID id) {
        var rows = jdbc.query("""
            select a.id, a.parking_lot_id, pl.name as parking_lot_name,
                   a.type, a.severity, a.state, a.zone, a.spot_number, a.sensor_id,
                   a.plate, a.description, a.photo_url, a.attributed_to, a.notes,
                   a.resolved_at, a.created_at
            from alerts a
            join parking_lots pl on pl.id = a.parking_lot_id
            where a.id = ?::uuid
            """,
            this::mapRow,
            id.toString()
        );
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    private Alert mapRow(ResultSet rs, int rowNum) throws SQLException {
        Alert a = new Alert();
        a.setId(UUID.fromString(rs.getString("id")));
        a.setParkingLotId(UUID.fromString(rs.getString("parking_lot_id")));
        a.setParkingLotName(rs.getString("parking_lot_name"));
        a.setType(AlertType.valueOf(rs.getString("type")));
        a.setSeverity(SeverityAlert.valueOf(rs.getString("severity")));
        a.setState(StateAlert.valueOf(rs.getString("state")));
        a.setZone(rs.getString("zone"));
        a.setSpotNumber(rs.getString("spot_number"));
        a.setSensorId(rs.getString("sensor_id"));
        a.setPlate(rs.getString("plate"));
        a.setDescription(rs.getString("description"));
        a.setPhotoUrl(rs.getString("photo_url"));
        a.setAttributedTo(rs.getString("attributed_to"));
        a.setNotes(rs.getString("notes"));
        Timestamp resolvedAt = rs.getTimestamp("resolved_at");
        if (resolvedAt != null) a.setResolvedAt(resolvedAt.toInstant().atOffset(ZoneOffset.UTC));
        a.setCreatedAt(rs.getTimestamp("created_at").toInstant().atOffset(ZoneOffset.UTC));
        return a;
    }
}
