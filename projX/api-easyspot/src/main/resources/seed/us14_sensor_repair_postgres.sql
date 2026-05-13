-- US#14: Update Sensor State After Repairs — test/demo seed data.
-- Run AFTER sensor_logs_seed.sql (sensor_registry rows must exist).
--
-- Scenario: technician repairs IR-AV1-B07 (Fórum Aveiro, previously OFFLINE)
-- and updates it to OPERATIONAL. A second sensor is put into MAINTENANCE.

-- ─── Postgres: sensor_registry ───────────────────────────────────────────────

begin;

-- Simulate a sensor currently in maintenance (entry point for repair flow)
insert into sensor_registry (
    sensor_id, parking_lot_id, zone, status, last_seen_at, created_at
)
values (
    'IR-AV1-B09',
    '4731819f-a806-5c1f-be8c-a478d4276840',
    'Piso 0 – Zona B',
    'MAINTENANCE',
    now() - interval '1 hour',
    '2024-06-15 00:00:00'
)
on conflict (sensor_id) do update set
    status = excluded.status,
    last_seen_at = excluded.last_seen_at;

commit;
