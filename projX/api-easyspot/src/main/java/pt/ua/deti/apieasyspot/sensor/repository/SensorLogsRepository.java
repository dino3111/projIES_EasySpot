package pt.ua.deti.apieasyspot.sensor.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pt.ua.deti.apieasyspot.sensor.dto.SensorLogEntry;
import pt.ua.deti.apieasyspot.sensor.dto.SensorSummaryDto;

import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class SensorLogsRepository {

    private final @Qualifier("jdbcTemplate") JdbcTemplate jdbc;

    public List<SensorSummaryDto> findSensorsByParkIds(List<UUID> parkIds) {
        String placeholders = parkIds.stream().map(id -> "?::uuid").collect(java.util.stream.Collectors.joining(","));
        Object[] params = parkIds.stream().map(UUID::toString).toArray();
        return jdbc.query(
            """
            select sr.sensor_id, sr.parking_lot_id, pl.name as park_name, pl.city as park_city,
                   sr.zone, sr.status, sr.last_seen_at, sr.created_at
            from sensor_registry sr
            join parking_lots pl on pl.id = sr.parking_lot_id
            where sr.parking_lot_id in (
            """ + placeholders + """
            )
            order by sr.status, sr.sensor_id
            """,
            params,
            (rs, rowNum) -> new SensorSummaryDto(
                rs.getString("sensor_id"),
                UUID.fromString(rs.getString("parking_lot_id")),
                rs.getString("park_name"),
                rs.getString("park_city"),
                rs.getString("zone"),
                rs.getString("status").toLowerCase(),
                rs.getTimestamp("last_seen_at").toInstant().atOffset(ZoneOffset.UTC),
                rs.getTimestamp("created_at").toInstant().atOffset(ZoneOffset.UTC)
            ));
    }

    public List<SensorSummaryDto> findAllSensors() {
        return jdbc.query(
            """
            select sr.sensor_id, sr.parking_lot_id, pl.name as park_name, pl.city as park_city,
                   sr.zone, sr.status, sr.last_seen_at, sr.created_at
            from sensor_registry sr
            join parking_lots pl on pl.id = sr.parking_lot_id
            order by sr.status, sr.sensor_id
            """,
            (rs, rowNum) -> new SensorSummaryDto(
                rs.getString("sensor_id"),
                UUID.fromString(rs.getString("parking_lot_id")),
                rs.getString("park_name"),
                rs.getString("park_city"),
                rs.getString("zone"),
                rs.getString("status").toLowerCase(),
                rs.getTimestamp("last_seen_at").toInstant().atOffset(ZoneOffset.UTC),
                rs.getTimestamp("created_at").toInstant().atOffset(ZoneOffset.UTC)
            ));
    }

    public List<SensorLogEntry> findLogsBySensorId(String sensorId) {
        return jdbc.query(
            """
            select id, type, severity, state, description, created_at, resolved_at
            from alerts
            where sensor_id = ?
            order by created_at desc
            limit 100
            """,
            (rs, rowNum) -> new SensorLogEntry(
                UUID.fromString(rs.getString("id")),
                rs.getString("type").toLowerCase(),
                rs.getString("severity").toLowerCase(),
                rs.getString("state").toLowerCase().replace("_", "-"),
                rs.getString("description"),
                rs.getTimestamp("created_at").toInstant().atOffset(ZoneOffset.UTC),
                rs.getTimestamp("resolved_at") != null
                    ? rs.getTimestamp("resolved_at").toInstant().atOffset(ZoneOffset.UTC)
                    : null
            ),
            sensorId);
    }
}
