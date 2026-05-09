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
import java.util.List;
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
            insert into alerts (id, parking_lot_id, parking_lot_name, type, severity, state, zone, spot_number,
                sensor_id, plate, description, photo_url, attributed_to, notes, resolved_at, created_at)
            values (?::uuid, ?::uuid, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            on conflict (id, created_at) do update set
                state = excluded.state,
                severity = excluded.severity,
                attributed_to = excluded.attributed_to,
                notes = excluded.notes,
                resolved_at = excluded.resolved_at,
                photo_url = excluded.photo_url,
                parking_lot_name = excluded.parking_lot_name
            """,
            alert.getId().toString(),
            alert.getParkingLotId().toString(),
            alert.getParkingLotName(),
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

    public List<Alert> findAll() {
        return jdbc.query("""
            select id, parking_lot_id, parking_lot_name, type, severity, state, zone, spot_number,
                   sensor_id, plate, description, photo_url, attributed_to, notes, resolved_at, created_at
            from alerts
            """,
            this::mapRow
        );
    }

    public List<Alert> findAllFiltered(UUID parkId, StateAlert state, SeverityAlert severity) {
        StringBuilder sql = new StringBuilder("""
            select id, parking_lot_id, parking_lot_name, type, severity, state, zone, spot_number,
                   sensor_id, plate, description, photo_url, attributed_to, notes, resolved_at, created_at
            from alerts
            where 1=1
            """);
        java.util.List<Object> params = new java.util.ArrayList<>();

        if (parkId != null) {
            sql.append(" and parking_lot_id = ?::uuid");
            params.add(parkId.toString());
        }
        if (state != null) {
            sql.append(" and state = ?");
            params.add(state.name());
        }
        if (severity != null) {
            sql.append(" and severity = ?");
            params.add(severity.name());
        }

        sql.append(" order by created_at desc");

        return jdbc.query(sql.toString(), this::mapRow, params.toArray());
    }

    public Optional<Alert> findById(UUID id) {
        var rows = jdbc.query("""
            select id, parking_lot_id, parking_lot_name, type, severity, state, zone, spot_number,
                   sensor_id, plate, description, photo_url, attributed_to, notes, resolved_at, created_at
            from alerts
            where id = ?::uuid
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
