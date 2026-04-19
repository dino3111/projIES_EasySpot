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
    public void run(ApplicationArguments args) {
        try {
            jdbc.execute("create extension if not exists timescaledb cascade");
            createHypertables();
            createViews();
            createContinuousAggregates();
            addPolicies();
            log.info("TimescaleDB initialization complete.");
        } catch (Exception e) {
            log.warn("TimescaleDB initialization skipped: {}", e.getMessage());
        }
    }

    private void createHypertables() {
        jdbc.execute("select create_hypertable('occupancy_snapshots', 'recorded_at', if_not_exists => true, migrate_data => true)");
        jdbc.execute("select create_hypertable('parking_sessions', 'entry_time', if_not_exists => true, migrate_data => true)");
        jdbc.execute("select create_hypertable('alerts', 'created_at', if_not_exists => true, migrate_data => true)");
        log.info("TimescaleDB hypertables ready.");
    }

    private void createViews() {
        jdbc.execute("""
            crate or replace view v_latest_occupancy as
            select distinct on(parking_lot_id, zone_type)
                parking_lot_id, zone_type, occupied_count, total_count, recorded_at
            from occupancy_snapshots
            order by parking_lot_id, zone_type, recorded_at desc
            """);
        log.info("Database views ready.");
    }

    private void createContinuousAggregates() {
        try {
            jdbc.execute("""
                create materialized view cagg_hourly_occupancy
                with (timescaledb.continuous, timescaledb.materialized_only = false)
                as
                select
                    time_bucket('1 hour', recorded_at) as hour_bucket,
                    parking_lot_id,
                    zone_type,
                    avg(occupied_count * 100.0 / nullif(total_count, 0)) as occupancy_pct
                from occupancy_snapshots
                group by hour_bucket, parking_lot_id, zone_type
                """);
            log.info("Continuous aggregate cagg_hourly_occupancy created.");
        } catch (Exception e) {
            log.debug("cagg_hourly_occupancy already exists, skipping creation.");
        }
    }

    private void addPolicies() {
        enableCompression();
        addCompressionPolicy();
        addRetentionPolicy();
        addCaggRefreshPolicy();
    }

    private void enableCompression() {
        try {
            jdbc.execute("""
                alter table occupancy_snapshots set (
                    timescaledb.compress,
                    timescaledb.compress_segmentby = 'parking_lot_id,zone_type',
                    timescaledb.compress_orderby = 'recorded_at DESC'
                )
                """);
        } catch (Exception e) {
            log.debug("Compression settings already applied: {}", e.getMessage());
        }
    }

    private void addCompressionPolicy() {
        try {
            jdbc.execute("select add_compression_policy('occupancy_snapshots', compress_after => interval '30 days', if_not_exists => true)");
        } catch (Exception e) {
            log.debug("Compression policy skipped: {}", e.getMessage());
        }
    }

    private void addRetentionPolicy() {
        try {
            jdbc.execute("select add_retention_policy('occupancy_snapshots', drop_after => interval '365 days', if_not_exists => true)");
        } catch (Exception e) {
            log.debug("Retention policy skipped: {}", e.getMessage());
        }
    }

    private void addCaggRefreshPolicy() {
        try {
            jdbc.execute("""
                select add_continuous_aggregate_policy('cagg_hourly_occupancy',
                    start_offset => interval '3 hours',
                    end_offset   => interval '1 hour',
                    schedule_interval => interval '1 hour',
                    if_not_exists => true)
                """);
        } catch (Exception e) {
            log.debug("Continuous aggregate refresh policy skipped: {}", e.getMessage());
        }
    }
}
