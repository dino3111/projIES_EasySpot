package pt.ua.deti.apieasyspot.infrastructure;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@Order(1)
public class TimescaleHypertableInitializer implements ApplicationRunner {

    private final JdbcTemplate jdbc;

    public TimescaleHypertableInitializer(@Qualifier("timescaleJdbcTemplate") JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            jdbc.execute("create extension if not exists timescaledb cascade");
            jdbc.execute("create extension if not exists pg_stat_statements");
            createHypertables();
            createUdfs();
            createTriggers();
            createViews();
            createContinuousAggregates();
            addPolicies();
            applyStorageSettings();
            createPartialIndexes();
            log.info("TimescaleDB initialization complete.");
        } catch (Exception e) {
            log.warn("TimescaleDB initialization skipped: {}", e.getMessage());
        }
    }

    private void createHypertables() {
        createHypertable("occupancy_snapshots", "recorded_at");
        createHypertable("parking_sessions", "entry_time");
        createHypertable("alerts", "created_at");
        log.info("TimescaleDB hypertables ready.");
    }

    private void createHypertable(String tableName, String timeColumn) {
        try {
            jdbc.execute(
                "select create_hypertable('%s', '%s', if_not_exists => true, migrate_data => true)"
                    .formatted(tableName, timeColumn)
            );
        } catch (Exception exception) {
            String message = exception.getMessage();
            if (message != null && message.contains("TS103")) {
                log.info(
                    "Skipping hypertable conversion for {} because its unique key does not include {}.",
                    tableName, timeColumn
                );
                return;
            }
            throw exception;
        }
    }

    private void createUdfs() {
        jdbc.execute("""
            create or replace function fn_occupancy_pct(occupied int, total int)
            returns numeric as $$
                select round(occupied * 100.0 / nullif(total, 0), 1)
            $$ language sql immutable;
            """);
        log.info("UDFs ready.");
    }

    private void createTriggers() {
        jdbc.execute("""
            create or replace function trg_alerts_resolved_at()
            returns trigger as $$
            begin
                if new.state = 'RESOLVED' and old.state != 'RESOLVED' then
                    new.resolved_at = now();
                elsif new.state != 'RESOLVED' then
                    new.resolved_at = null;
                end if;
                return new;
            end;
            $$ language plpgsql;
            """);
        jdbc.execute("""
            create or replace trigger alerts_auto_resolved_at
            before update on alerts
            for each row execute function trg_alerts_resolved_at();
            """);
        log.info("Triggers ready.");
    }

    private void createViews() {
        jdbc.execute("""
            create or replace view v_latest_occupancy as
            select distinct on (parking_lot_id, zone_type)
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
                    avg(fn_occupancy_pct(occupied_count, total_count)) as occupancy_pct
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
                    timescaledb.compress_orderby = 'recorded_at desc'
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

    private void applyStorageSettings() {
        try {
            jdbc.execute("alter table alerts set (fillfactor = 75)");
        } catch (Exception e) {
            log.debug("fillfactor already set: {}", e.getMessage());
        }
    }

    private void createPartialIndexes() {
        try {
            jdbc.execute("""
                create index if not exists idx_alerts_active
                on alerts (created_at desc, parking_lot_id)
                where state in ('OPEN', 'IN_PROGRESS')
                """);
        } catch (Exception e) {
            log.debug("idx_alerts_active skipped: {}", e.getMessage());
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
