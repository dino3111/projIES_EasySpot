package pt.ua.deti.apieasyspot.billing.repository;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pt.ua.deti.apieasyspot.billing.model.ParkingSession;
import pt.ua.deti.apieasyspot.occupancy.model.ZoneType;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

@Repository
public class TimescaleParkingSessionRepository {

    private final JdbcTemplate jdbc;

    public TimescaleParkingSessionRepository(@Qualifier("timescaleJdbcTemplate") JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public ParkingSession save(ParkingSession session) {
        if (session.getId() == null) {
            session.setId(UUID.randomUUID());
        }
        jdbc.update("""
            insert into parking_sessions (id, user_id, parking_lot_id, vehicle_id, zone_type, entry_time, exit_time, revenue_euros)
            values (?::uuid, ?::uuid, ?::uuid, ?::uuid, ?, ?, ?, ?)
            on conflict (id, entry_time) do update set
                exit_time = excluded.exit_time,
                revenue_euros = excluded.revenue_euros,
                zone_type = excluded.zone_type
            """,
            session.getId().toString(),
            session.getUserId() != null ? session.getUserId().toString() : null,
            session.getParkingLotId().toString(),
            session.getVehicleId() != null ? session.getVehicleId().toString() : null,
            session.getZoneType().name(),
            session.getEntryTime(),
            session.getExitTime(),
            session.getRevenueEuros()
        );
        return session;
    }

    public void deleteAll() {
        jdbc.update("delete from parking_sessions");
    }

    public List<ParkingSession> saveAll(List<ParkingSession> sessions) {
        sessions.forEach(this::save);
        return sessions;
    }

    public List<ParkingSession> findActiveByParkingLotId(UUID parkingLotId, OffsetDateTime afterTime) {
        return jdbc.query("""
            select id, user_id, parking_lot_id, vehicle_id, zone_type, entry_time, exit_time, revenue_euros
            from parking_sessions
            where parking_lot_id = ?::uuid and exit_time > ?
            """,
            this::mapRow,
            parkingLotId.toString(), afterTime
        );
    }

    public long countActiveByParkingLotId(UUID parkingLotId) {
        Long result = jdbc.queryForObject(
            "select count(*) from parking_sessions where parking_lot_id = ?::uuid and exit_time > now()",
            Long.class,
            parkingLotId.toString()
        );
        return result != null ? result : 0L;
    }

    private ParkingSession mapRow(ResultSet rs, int rowNum) throws SQLException {
        ParkingSession s = new ParkingSession();
        s.setId(UUID.fromString(rs.getString("id")));
        String userId = rs.getString("user_id");
        if (userId != null) s.setUserId(UUID.fromString(userId));
        s.setParkingLotId(UUID.fromString(rs.getString("parking_lot_id")));
        String vehicleId = rs.getString("vehicle_id");
        if (vehicleId != null) s.setVehicleId(UUID.fromString(vehicleId));
        s.setZoneType(ZoneType.valueOf(rs.getString("zone_type")));
        s.setEntryTime(rs.getTimestamp("entry_time").toInstant().atOffset(ZoneOffset.UTC));
        s.setExitTime(rs.getTimestamp("exit_time").toInstant().atOffset(ZoneOffset.UTC));
        s.setRevenueEuros(rs.getBigDecimal("revenue_euros"));
        return s;
    }
}
