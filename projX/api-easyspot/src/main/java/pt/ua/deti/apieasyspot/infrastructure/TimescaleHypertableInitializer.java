package pt.ua.deti.apieasyspot.infrastructure;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class TimescaleHypertableInitializer implements ApplicationRunner {
    private final JdbcTemplate jdbc;

    @Override
    public void run(ApplicationArguments args){
        try{
            jdbc.execute("create extension if not exists timescaledb cascade");
            jdbc.execute("select create_hypertable('occupancy_snapshots', 'recorded_at', if_not_exists => TRUE)");
            log.info("TimescaleDB hypertable 'occupancy_snapshots' ready.");
        } catch (Exception e){
            log.warn("Hypertable creation skipped (no TimescaleDB): {}", e.getMessage());
        }
    }
}
