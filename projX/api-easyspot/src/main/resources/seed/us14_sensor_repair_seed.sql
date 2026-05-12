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

-- ─── TimescaleDB: alerts ──────────────────────────────────────────────────────

begin;

delete from alerts
where sensor_id = 'IR-AV1-B09';

insert into alerts (
    id, parking_lot_id, parking_lot_name, type, severity, state,
    zone, spot_number, sensor_id, plate, description,
    photo_url, attributed_to, notes, created_at, resolved_at
)
values
-- Active alert: sensor in maintenance
(
    gen_random_uuid(),
    '4731819f-a806-5c1f-be8c-a478d4276840',
    'Fórum Aveiro',
    'SENSOR', 'WARNING', 'OPEN',
    'Piso 0 – Zona B', 'B9', 'IR-AV1-B09',
    null,
    'Sensor IR-AV1-B09 em manutenção programada. Substituição de emissor IR.',
    null, 'Test Technical', 'Peça encomendada. ETA: 24h.',
    now() - interval '1 hour', null
),
-- Historical alert: previous failure that triggered the repair
(
    gen_random_uuid(),
    '4731819f-a806-5c1f-be8c-a478d4276840',
    'Fórum Aveiro',
    'SENSOR', 'CRITICAL', 'RESOLVED',
    'Piso 0 – Zona B', 'B9', 'IR-AV1-B09',
    null,
    'Sensor IR-AV1-B09 sem leituras há >3h. Emissor IR queimado.',
    null, 'Test Technical', 'Colocado em manutenção. Substituição agendada.',
    now() - interval '2 days',
    now() - interval '1 hour'
);

commit;
