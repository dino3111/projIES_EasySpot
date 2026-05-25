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
import java.sql.ResultSet;
import java.sql.Statement;

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
        execute(relationalDataSource, "seed/add_park_status_column.sql", "Parking lot status and district migration");
        execute(relationalDataSource, "seed/parking_seed_postgres.sql", "Postgres relational parking seed");
        execute(relationalDataSource, "seed/test_users_seed.sql", "Test users and park assignments seed");
        execute(relationalDataSource, "seed/spending_test_data.sql", "Spending test data seed (postgres)");
        execute(relationalDataSource, "seed/test_driver_spending.sql", "Test driver vehicles seed (postgres)");
        execute(relationalDataSource, "seed/us11_test_data.sql", "US11 tariff and audit seed");
        execute(relationalDataSource, "seed/us_missing_tables_seed.sql", "Sensor registry, reservations, favorites and alert subscriptions seed");
        execute(relationalDataSource, "seed/us13_infrastructure_test_data.sql", "US13 infrastructure mapping seed (postgres)");
        execute(relationalDataSource, "seed/sensor_logs_postgres.sql", "Sensor registry seed (postgres)");
        execute(relationalDataSource, "seed/us14_sensor_repair_postgres.sql", "US14 sensor repair seed (postgres)");
        execute(timescaleDataSource, "seed/us_gate_events_seed.sql", "Gate events table init and seed (timescale)");
        executeIfTableEmpty(timescaleDataSource, "seed/parking_seed_timescale.sql", "Timescale occupancy seed", "occupancy_snapshots");
        execute(timescaleDataSource, "seed/spending_sessions_timescale.sql", "Spending sessions seed (timescale)");
        execute(timescaleDataSource, "seed/test_driver_sessions_timescale.sql", "Test driver sessions seed (timescale)");
        execute(timescaleDataSource, "seed/us05_reports_timescale.sql", "US5 client reports seed (timescale)");
        executeIfTableEmpty(timescaleDataSource, "seed/us10_dashboard_test_data.sql", "US10 dashboard seed (timescale)", "occupancy_snapshots");
        execute(timescaleDataSource, "seed/us11_alerts_timescale.sql", "US11 alerts issue log seed");
        execute(timescaleDataSource, "seed/sensor_logs_timescale.sql", "Sensor alerts seed (timescale)");
        execute(timescaleDataSource, "seed/us14_sensor_repair_timescale.sql", "US14 sensor repair seed (timescale)");
    }

    private void execute(DataSource dataSource, String classpathFile, String label) {
        try (Connection connection = dataSource.getConnection()) {
            ScriptUtils.executeSqlScript(connection, new ClassPathResource(classpathFile));
            log.info("{} applied from {}", label, classpathFile);
        } catch (Exception e) {
            log.warn("{} skipped ({}): {}", label, classpathFile, e.getMessage());
        }
    }

    private void executeIfTableEmpty(DataSource dataSource, String classpathFile, String label, String tableName) {
        try (Connection connection = dataSource.getConnection()) {
            if (!isTableEmpty(connection, tableName)) {
                log.info("{} skipped because {} already contains data", label, tableName);
                return;
            }
            ScriptUtils.executeSqlScript(connection, new ClassPathResource(classpathFile));
            log.info("{} applied from {}", label, classpathFile);
        } catch (Exception e) {
            log.warn("{} skipped ({}): {}", label, classpathFile, e.getMessage());
        }
    }

    private boolean isTableEmpty(Connection connection, String tableName) throws Exception {
        try (Statement statement = connection.createStatement();
             ResultSet resultSet = statement.executeQuery("select exists (select 1 from " + tableName + " limit 1)")) {
            return resultSet.next() && !resultSet.getBoolean(1);
        }
    }
}
