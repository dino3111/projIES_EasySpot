package pt.ua.deti.apieasyspot.infrastructure;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@Order(2)
public class PostgresIndexInitializer implements ApplicationRunner {

    private final JdbcTemplate jdbc;

    public PostgresIndexInitializer(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            dropEmptyTimeseriesTables();
            fixSensorRegistryStatusConstraint();
            createPaymentIndexes();
            createReservationConstraints();
            log.info("PostgreSQL index initialization complete.");
        } catch (Exception e) {
            log.warn("PostgreSQL index initialization skipped: {}", e.getMessage());
        }
    }

    private void dropEmptyTimeseriesTables() {
        dropTableIfEmpty("alerts");
        dropTableIfEmpty("ocr_plate_reads");
    }

    private void dropTableIfEmpty(String tableName) {
        try {
            Long rowCount = jdbc.queryForObject("select count(*) from " + tableName, Long.class);
            if (rowCount != null && rowCount == 0) {
                jdbc.execute("drop table " + tableName);
                log.info("Dropped empty PostgreSQL table {} because it is stored in TimescaleDB.", tableName);
            }
        } catch (Exception e) {
            log.debug("PostgreSQL timeseries table cleanup skipped for {}: {}", tableName, e.getMessage());
        }
    }

    private void fixSensorRegistryStatusConstraint() {
        exec("ALTER TABLE sensor_registry DROP CONSTRAINT IF EXISTS sensor_registry_status_check");
        exec("ALTER TABLE sensor_registry ADD CONSTRAINT sensor_registry_status_check CHECK (status::text = ANY (ARRAY['OPERATIONAL', 'DEGRADED', 'OFFLINE', 'MAINTENANCE']::text[]))");
    }

    private void createPaymentIndexes() {
        exec("create index if not exists idx_payment_records_reservation_id on payment_records (reservation_id, created_at desc)");
        exec("create index if not exists idx_payment_records_stripe_session_id on payment_records (stripe_session_id) where stripe_session_id is not null");
        exec("create index if not exists idx_payment_records_payment_intent_id on payment_records (payment_intent_id) where payment_intent_id is not null");
        exec("create index if not exists idx_payment_records_status on payment_records (status, created_at desc) where status in ('PENDING', 'COMPLETED')");
        exec("create index if not exists idx_stripe_events_processed_at on processed_stripe_events (processed_at desc)");
        log.info("Payment indexes ready.");
    }

    private void createReservationConstraints() {
        exec("create extension if not exists btree_gist");
        exec("""
            alter table reservations
            add constraint reservations_no_spot_overlap
            exclude using gist (
                parking_spot_id with =,
                tstzrange(arrival_time, departure_time, '[)') with &&
            )
            where (parking_spot_id is not null and status in ('CONFIRMED', 'PENDING'))
            """);
        exec("create unique index if not exists uq_reservations_user_idempotency on reservations (user_id, idempotency_key) where idempotency_key is not null");
        log.info("Reservation overlap/idempotency constraints ready.");
    }

    private void exec(String sql) {
        try {
            jdbc.execute(sql);
        } catch (Exception e) {
            log.debug("Index skipped: {}", e.getMessage());
        }
    }
}
