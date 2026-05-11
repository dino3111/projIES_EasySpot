package pt.ua.deti.apieasyspot.auth.repository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pt.ua.deti.apieasyspot.auth.dto.SpendingSummary;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
@Slf4j
public class ProfileRepository {

    private final @Qualifier("timescaleJdbcTemplate") JdbcTemplate jdbc;

    public SpendingSummary spendingSummary(UUID userId) {
        try {
            return jdbc.queryForObject(
                """
                select coalesce(sum(revenue_euros), 0) as total,
                       count(*) as sessions
                from parking_sessions
                where user_id = ?
                  and exit_time is not null
                  and revenue_euros is not null
                """,
                (rs, row) -> {
                    BigDecimal total = rs.getBigDecimal("total");
                    long sessions = rs.getLong("sessions");
                    BigDecimal avg = sessions > 0
                        ? total.divide(BigDecimal.valueOf(sessions), 2, RoundingMode.HALF_UP)
                        : BigDecimal.ZERO;
                    return new SpendingSummary(total, sessions, avg);
                },
                userId);
        } catch (DataAccessException ex) {
            log.warn("Falling back to zero spending summary for userId={} due to Timescale query failure: {}", userId, ex.getMessage());
            return new SpendingSummary(BigDecimal.ZERO, 0L, BigDecimal.ZERO);
        }
    }

    public long countAssignedTasks(String authentikUserId) {
        Long result = jdbc.queryForObject(
            """
            select count(*) from alerts
            where attributed_to = ?
              and state in ('OPEN', 'IN_PROGRESS')
            """,
            Long.class, authentikUserId);
        return result != null ? result : 0L;
    }
}
