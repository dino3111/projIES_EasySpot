package pt.ua.deti.apieasyspot.infrastructure;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;

@Slf4j
@Component
@Order(3)
@RequiredArgsConstructor
public class ParkingSeedInitializer implements ApplicationRunner {

    private final DataSource dataSource;

    @Override
    public void run(ApplicationArguments args) {
        execute("seed/parking_seed_postgres.sql", "Postgres relational parking seed");
        execute("seed/parking_seed_timescale.sql", "Timescale occupancy seed");
    }

    private void execute(String classpathFile, String label) {
        try (Connection connection = dataSource.getConnection()) {
            ScriptUtils.executeSqlScript(connection, new ClassPathResource(classpathFile));
            log.info("{} applied from {}", label, classpathFile);
        } catch (Exception e) {
            log.warn("{} skipped ({}): {}", label, classpathFile, e.getMessage());
        }
    }
}

