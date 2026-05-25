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
            // Keep the core tables available even when TimescaleDB extension is missing
            // (e.g., CI jobs using plain PostgreSQL for Postman/Newman flows).
            prepareOccupancySnapshotTable();
            prepareParkingSessionsTable();
            prepareAlertsTable();
            prepareAlertStateHistoryTable();
            prepareBackendDecisionHistoryTable();
            prepareOcrPlateReadsTable();
            prepareGateEventsTable();
        } catch (Exception e) {
            log.warn("TimescaleDB base table initialization skipped: {}", e.getMessage());
            return;
        }

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

    private void prepareOccupancySnapshotTable() {
        jdbc.execute("""
            create table if not exists occupancy_snapshots (
                id uuid not null,
                parking_lot_id uuid not null,
                zone_type text not null,
                occupied_count integer not null,
                total_count integer not null,
                recorded_at timestamptz not null,
                primary key (id, recorded_at)
            )
            """);

        try {
            jdbc.execute("alter table occupancy_snapshots drop constraint if exists occupancy_snapshots_pkey");
            jdbc.execute("""
                alter table occupancy_snapshots
                add primary key (id, recorded_at)
                """);
        } catch (Exception exception) {
            log.debug("occupancy_snapshots primary key already matches hypertable requirements: {}", exception.getMessage());
        }
    }

    private void prepareParkingSessionsTable() {
        jdbc.execute("""
            create table if not exists parking_sessions (
                id uuid not null,
                reservation_id uuid,
                user_id uuid,
                parking_lot_id uuid not null,
                vehicle_id uuid,
                zone_type text not null,
                entry_time timestamptz not null,
                exit_time timestamptz,
                revenue_euros numeric(8, 2),
                primary key (id, entry_time)
            )
            """);
        try {
            jdbc.execute("alter table parking_sessions add column if not exists reservation_id uuid");
            jdbc.execute("alter table parking_sessions alter column exit_time drop not null");
        } catch (Exception exception) {
            log.debug("parking_sessions schema already matches expected shape: {}", exception.getMessage());
        }
    }

    private void prepareAlertsTable() {
        jdbc.execute("""
            create table if not exists alerts (
                id uuid not null,
                parking_lot_id uuid not null,
                parking_lot_name text,
                type text not null,
                severity text not null,
                state text not null,
                zone text,
                spot_number text,
                sensor_id text,
                plate text,
                description text not null,
                photo_url text,
                reported_by text,
                attributed_to text,
                notes text,
                resolved_at timestamptz,
                created_at timestamptz not null,
                primary key (id, created_at)
            )
            """);
        try {
            jdbc.execute("alter table alerts add column if not exists parking_lot_name text");
            jdbc.execute("alter table alerts add column if not exists reported_by text");
        } catch (Exception e) {
            log.debug("alerts.parking_lot_name column already exists: {}", e.getMessage());
        }
    }

    private void prepareOcrPlateReadsTable() {
        jdbc.execute("""
            create table if not exists ocr_plate_reads (
                id          uuid        not null,
                park_id     uuid        not null,
                spot_id     uuid,
                plate       varchar(20) not null,
                confidence  double precision not null,
                direction   varchar(10) not null,
                failure_mode varchar(30),
                occurred_at timestamptz not null,
                extra       jsonb       not null default '{}',
                primary key (id, occurred_at)
            )
            """);
        try {
            jdbc.execute("alter table ocr_plate_reads add column if not exists failure_mode varchar(30)");
        } catch (Exception exception) {
            log.debug("ocr_plate_reads.failure_mode column already exists: {}", exception.getMessage());
        }
    }

    private void createHypertables() {
        boolean occupancyHypertable = createHypertable("occupancy_snapshots", "recorded_at");
        boolean parkingSessionsHypertable = createHypertable("parking_sessions", "entry_time");
        boolean alertsHypertable = createHypertable("alerts", "created_at");
        boolean alertHistoryHypertable = createHypertable("alert_state_history", "changed_at");
        boolean decisionHistoryHypertable = createHypertable("backend_decision_history", "decided_at");
        boolean ocrReadsHypertable = createHypertable("ocr_plate_reads", "occurred_at");
        boolean gateEventsHypertable = createHypertable("gate_events", "occurred_at");
        if (!occupancyHypertable || !parkingSessionsHypertable || !alertsHypertable
            || !alertHistoryHypertable || !decisionHistoryHypertable || !ocrReadsHypertable
            || !gateEventsHypertable) {
            throw new IllegalStateException("One or more Timescale tables could not be converted to hypertables.");
        }
        log.info("TimescaleDB hypertables ready.");
    }

    private void prepareGateEventsTable() {
        jdbc.execute("""
            create table if not exists gate_events (
                id uuid not null,
                park_id uuid not null,
                gate_id text not null,
                direction varchar(10) not null,
                event_type text not null,
                state varchar(10) not null,
                previous_state varchar(10) not null,
                plate varchar(20),
                reason text not null,
                occurred_at timestamptz not null,
                extra jsonb not null default '{}',
                primary key (id, occurred_at)
            )
            """);
    }

    private void prepareAlertStateHistoryTable() {
        jdbc.execute("""
            create table if not exists alert_state_history (
                id uuid not null,
                alert_id uuid not null,
                previous_state text,
                new_state text not null,
                changed_by text,
                notes text,
                changed_at timestamptz not null,
                primary key (id, changed_at)
            )
            """);
    }

    private void prepareBackendDecisionHistoryTable() {
        jdbc.execute("""
            create table if not exists backend_decision_history (
                id uuid not null,
                entity_type text not null,
                entity_id text not null,
                decision_type text not null,
                decision_source text not null,
                details text,
                decided_at timestamptz not null,
                primary key (id, decided_at)
            )
            """);
    }

    private boolean createHypertable(String tableName, String timeColumn) {
        try {
            jdbc.execute(
                "select create_hypertable('%s', '%s', if_not_exists => true, migrate_data => true)"
                    .formatted(tableName, timeColumn)
            );
            return true;
        } catch (Exception exception) {
            String message = exception.getMessage();
            if (message != null && message.contains("TS103")) {
                log.info(
                    "Skipping hypertable conversion for {} because its unique key does not include {}.",
                    tableName, timeColumn
                );
                return false;
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
            log.debug("cagg_hourly_occupancy already exists or could not be created: {}", e.getMessage());
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
            log.debug("Compression settings skipped: {}", e.getMessage());
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
