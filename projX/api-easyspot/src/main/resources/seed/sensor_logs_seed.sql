-- Seed data for sensor_registry (PostgreSQL) and alerts (TimescaleDB).
-- Run AFTER parking_seed_postgres.sql (requires parking_lots rows to exist).
-- Idempotent via ON CONFLICT / DELETE+INSERT.

-- ─── sensor_registry (Postgres) ──────────────────────────────────────────────

BEGIN;

INSERT INTO sensor_registry (sensor_id, parking_lot_id, zone, status, last_seen_at, created_at)
VALUES
  -- Estádio Cidade de Coimbra
  ('IR-CO1-MR02',   'b231a846-7d40-5100-ba29-b9c0ca0ef9aa', 'Piso -1 – Mobilidade Reduzida', 'OFFLINE',      NOW() - INTERVAL '2 hours',    '2024-04-10 00:00:00'),
  ('IR-CO1-MR01',   'b231a846-7d40-5100-ba29-b9c0ca0ef9aa', 'Piso -1 – Mobilidade Reduzida', 'OPERATIONAL',  NOW() - INTERVAL '5 minutes',  '2024-04-10 00:00:00'),
  ('IR-CO1-A01',    'b231a846-7d40-5100-ba29-b9c0ca0ef9aa', 'Piso 0 – Zona A',               'OPERATIONAL',  NOW() - INTERVAL '4 minutes',  '2024-04-12 00:00:00'),
  ('RFID-CO1-ENT1', 'b231a846-7d40-5100-ba29-b9c0ca0ef9aa', 'Entrada Principal',             'OPERATIONAL',  NOW() - INTERVAL '3 minutes',  '2024-04-01 00:00:00'),
  ('GW-CO1-01',     'b231a846-7d40-5100-ba29-b9c0ca0ef9aa', 'Sala Técnica',                  'OPERATIONAL',  NOW() - INTERVAL '2 minutes',  '2024-03-28 00:00:00')
ON CONFLICT (sensor_id) DO UPDATE SET
  status       = EXCLUDED.status,
  last_seen_at = EXCLUDED.last_seen_at;

COMMIT;

-- ─── alerts (TimescaleDB) ─────────────────────────────────────────────────────
-- Run this block against the TimescaleDB data source.

BEGIN;

DELETE FROM alerts
WHERE sensor_id IN ('IR-CO1-MR02','IR-CO1-MR01','IR-CO1-A01','RFID-CO1-ENT1','GW-CO1-01');

INSERT INTO alerts (
  id, parking_lot_id, parking_lot_name, type, severity, state,
  zone, spot_number, sensor_id, plate, description,
  photo_url, attributed_to, notes, created_at, resolved_at
)
VALUES
  -- IR-CO1-MR02: active critical failure
  (
    gen_random_uuid(),
    'b231a846-7d40-5100-ba29-b9c0ca0ef9aa',
    'Estádio Cidade de Coimbra',
    'SENSOR', 'CRITICAL', 'OPEN',
    'Piso -1 – Mobilidade Reduzida', 'MR-02', 'IR-CO1-MR02',
    NULL, 'Falha total do sensor MR-02. Lugar sem monitorização ativa.',
    NULL, NULL, NULL,
    NOW() - INTERVAL '2 hours', NULL
  ),
  -- IR-CO1-MR02: warning resolved yesterday
  (
    gen_random_uuid(),
    'b231a846-7d40-5100-ba29-b9c0ca0ef9aa',
    'Estádio Cidade de Coimbra',
    'SENSOR', 'WARNING', 'RESOLVED',
    'Piso -1 – Mobilidade Reduzida', 'MR-02', 'IR-CO1-MR02',
    NULL, 'Lugar detetado como livre após 3h de ocupação (falso-negativo). Recalibrado.',
    NULL, 'Laura Farias', 'Recalibração automática bem-sucedida.',
    NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day 20 hours'
  ),
  -- IR-CO1-MR02: weak signal resolved 3 days ago
  (
    gen_random_uuid(),
    'b231a846-7d40-5100-ba29-b9c0ca0ef9aa',
    'Estádio Cidade de Coimbra',
    'SENSOR', 'WARNING', 'RESOLVED',
    'Piso -1 – Mobilidade Reduzida', 'MR-02', 'IR-CO1-MR02',
    NULL, 'Potência IR reduzida a 25% da nominal.',
    NULL, 'Laura Farias', NULL,
    NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days 22 hours'
  ),
  -- RFID-CO1-ENT1: system alert resolved last week
  (
    gen_random_uuid(),
    'b231a846-7d40-5100-ba29-b9c0ca0ef9aa',
    'Estádio Cidade de Coimbra',
    'SYSTEM', 'WARNING', 'RESOLVED',
    'Entrada Principal', NULL, 'RFID-CO1-ENT1',
    NULL, 'Reinício automático por watchdog. Serviço restaurado após 45s.',
    NULL, NULL, NULL,
    NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days' + INTERVAL '1 minute'
  ),
  -- GW-CO1-01: info event (no failure)
  (
    gen_random_uuid(),
    'b231a846-7d40-5100-ba29-b9c0ca0ef9aa',
    'Estádio Cidade de Coimbra',
    'SYSTEM', 'INFO', 'RESOLVED',
    'Sala Técnica', NULL, 'GW-CO1-01',
    NULL, 'Atualização de firmware GW v5.0.1→v5.0.2 concluída com sucesso.',
    NULL, 'Laura Farias', NULL,
    NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days' + INTERVAL '30 minutes'
  );

COMMIT;
