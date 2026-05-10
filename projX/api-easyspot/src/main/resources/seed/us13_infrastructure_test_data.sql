-- US #13: Infrastructure Mapping & Status Monitoring — test seed data
-- Run after parking_seed_postgres.sql and the schema has been created.
-- Adds EV chargers and accessible spots with full infrastructure fields
-- (monitored, has_ramp_space, sensor_status, led_status)
-- for existing parking lots.
--
-- Parking lots referenced (from parking_seed_postgres.sql):
--   b231a846-7d40-5100-ba29-b9c0ca0ef9aa  Estádio Cidade de Coimbra
--   (others follow the same pattern)

BEGIN;

-- ── EV Chargers ────────────────────────────────────────────────────────────
-- Estádio Cidade de Coimbra: 2 Type 2 (1 available),
-- 1 CCS ultra-fast (available)
DELETE FROM ev_chargers WHERE parking_lot_id = 'b231a846-7d40-5100-ba29-b9c0ca0ef9aa';

INSERT INTO ev_chargers (id, parking_lot_id, type, speed, price_per_kwh, available) VALUES
  ('ec10-0001-0000-0000-000000000001', 'b231a846-7d40-5100-ba29-b9c0ca0ef9aa', 'Type 2',  'Rápida (22kW)',       0.30, true),
  ('ec10-0001-0000-0000-000000000002', 'b231a846-7d40-5100-ba29-b9c0ca0ef9aa', 'Type 2',  'Rápida (22kW)',       0.30, false),
  ('ec10-0001-0000-0000-000000000003', 'b231a846-7d40-5100-ba29-b9c0ca0ef9aa', 'CCS',     'Ultra-rápida (50kW)', 0.45, true);

-- ── Accessible Spots ────────────────────────────────────────────────────────
-- Estádio Cidade de Coimbra: 3 accessible bays with full infrastructure metadata
DELETE FROM accessible_spots WHERE parking_lot_id = 'b231a846-7d40-5100-ba29-b9c0ca0ef9aa';

INSERT INTO accessible_spots
  (id, parking_lot_id, location, available, distance_to_entrance_meters, bay_size, monitored, has_ramp_space, sensor_status, led_status)
VALUES
  -- Closest to entrance, wide bay, monitored, sensor online, available
  ('ac10-0001-0000-0000-000000000001', 'b231a846-7d40-5100-ba29-b9c0ca0ef9aa',
   'Piso 0 — Entrada Principal', true,  8,  '4.5m x 5.5m', true,  true,  'online', 'green'),

  -- Mid-distance, standard bay, monitored, sensor online, occupied
  ('ac10-0001-0000-0000-000000000002', 'b231a846-7d40-5100-ba29-b9c0ca0ef9aa',
   'Piso 0 — Ala Norte',         false, 22, '3.5m x 5.0m', true,  true,  'online', 'red'),

  -- Far bay, not monitored, sensor faulty (LED yellow as warning)
  ('ac10-0001-0000-0000-000000000003', 'b231a846-7d40-5100-ba29-b9c0ca0ef9aa',
   'Piso -1 — Setor B',          false, 45, '3.5m x 5.0m', false, false, 'faulty', 'yellow');

COMMIT;
