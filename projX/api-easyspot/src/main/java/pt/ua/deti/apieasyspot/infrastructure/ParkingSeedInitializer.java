package pt.ua.deti.apieasyspot.infrastructure;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;

@Slf4j
@Component
@Order(3)
public class ParkingSeedInitializer implements ApplicationRunner {

    private final DataSource relationalDataSource;
    private final DataSource timescaleDataSource;

    public ParkingSeedInitializer(
        DataSource relationalDataSource,
        @Qualifier("timescaleDataSource") DataSource timescaleDataSource
    ) {
        this.relationalDataSource = relationalDataSource;
        this.timescaleDataSource = timescaleDataSource;
    }

    @Override
    public void run(ApplicationArguments args) {
        execute(relationalDataSource, "seed/parking_seed_postgres.sql", "Postgres relational parking seed");
        execute(relationalDataSource, "seed/spending_test_data.sql", "Spending test data seed (postgres)");
        execute(relationalDataSource, "seed/test_driver_spending.sql", "Test driver vehicles seed (postgres)");
        execute(relationalDataSource, "seed/us11_test_data.sql", "US11 tariff and audit seed");
        execute(timescaleDataSource, "seed/parking_seed_timescale.sql", "Timescale occupancy seed");
        execute(timescaleDataSource, "seed/spending_sessions_timescale.sql", "Spending sessions seed (timescale)");
        execute(timescaleDataSource, "seed/test_driver_sessions_timescale.sql", "Test driver sessions seed (timescale)");
        execute(timescaleDataSource, "seed/us11_alerts_timescale.sql", "US11 alerts issue log seed");
    }

    private void execute(DataSource dataSource, String classpathFile, String label) {
        try (Connection connection = dataSource.getConnection()) {
            ScriptUtils.executeSqlScript(connection, new ClassPathResource(classpathFile));
            log.info("{} applied from {}", label, classpathFile);
        } catch (Exception e) {
            log.warn("{} skipped ({}): {}", label, classpathFile, e.getMessage());
        }
    }
}
