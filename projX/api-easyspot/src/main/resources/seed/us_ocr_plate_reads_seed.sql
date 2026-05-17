-- OCR plate-read seed data for testing.
-- Uses real parking lots and spots already present in parking_seed_postgres.sql.
-- Parking lots referenced:
--   b231a846-7d40-5100-ba29-b9c0ca0ef9aa  Estádio Cidade de Coimbra (Coimbra)
--   452ed8eb-d0a3-5d61-8428-572...         second lot in seed
-- Spots referenced are the first two STANDARD spots in each lot.
--
-- The ocr_plate_reads table persists every OCR camera event consumed from
-- the Kafka topic parking-ocr-events.  It is a TimescaleDB hypertable
-- partitioned by occurred_at, so this seed goes in parking_seed_timescale.sql
-- or a dedicated migration; we keep it here for review/testing purposes only.

BEGIN;

-- ─── Vehicles (Portuguese plates format XX-00-XX) ──────────────────────────
-- These vehicles exist only for OCR testing; they are not linked to users.
-- anonymous test vehicles: user_id = NULL not allowed per FK; re-use existing
-- test user if available. OCR simulation does NOT require a registered vehicle.
-- Entries below are for documentation and manual testing with real users.
-- INSERT commented out intentionally — uncomment after seeding test_users_seed.sql
-- ('ocr00001-0000-0000-0000-000000000001', <test_user_id>, 'AB-12-CD', ...)
-- ('ocr00001-0000-0000-0000-000000000002', <test_user_id>, 'EF-34-GH', ...)

INSERT INTO user_vehicles (id, user_id, plate, vin, make, model, year, color, fuel_type, powertr, nickname, rfid, h_ew, h_accessible, charger_types, last_synced_at, synced_data, created_at, updated_at)
VALUES
('ocr00001-0000-0000-0000-000000000001', NULL, 'AB-12-CD', NULL, 'Renault', 'Clio', 2019, 'White', 'GASOLINE', 'ICE', NULL, NULL, NULL, NULL, NULL, NOW(), NULL, NOW(), NOW()),
('ocr00001-0000-0000-0000-000000000002', NULL, 'EF-34-GH', NULL, 'Volkswagen', 'Golf', 2021, 'Black', 'ELECTRIC', 'BEV', NULL, NULL, NULL, NULL, 'TYPE2', NOW(), NULL, NOW(), NOW()),
('ocr00001-0000-0000-0000-000000000003', NULL, 'IJ-56-KL', NULL, 'Toyota', 'Yaris', 2020, 'Blue', 'HYBRID', 'HEV', NULL, NULL, NULL, NULL, NULL, NOW(), NULL, NOW(), NOW()),
('ocr00001-0000-0000-0000-000000000004', NULL, 'MN-78-OP', NULL, 'Peugeot', '208', 2022, 'Red', 'GASOLINE', 'ICE', NULL, NULL, NULL, NULL, NULL, NOW(), NULL, NOW(), NOW()),
('ocr00001-0000-0000-0000-000000000005', NULL, 'QR-90-ST', NULL, 'BMW', 'i3', 2023, 'Silver', 'ELECTRIC', 'BEV', NULL, NULL, NULL, NULL, 'CCS,TYPE2', NOW(), NULL, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ─── Historical OCR plate-read events ─────────────────────────────────────
-- Table: ocr_plate_reads (TimescaleDB hypertable, partitioned by occurred_at)
-- Columns: id, park_id, spot_id, plate, confidence, direction, occurred_at, extra
-- These rows simulate a day's worth of entry/exit events for two parks.
-- Estádio Cidade de Coimbra: morning entries, afternoon exits, one still parked.
-- Second lot (ee000001... test lot): entries and exits.

INSERT INTO ocr_plate_reads (id, park_id, spot_id, plate, confidence, direction, occurred_at, extra)
VALUES
(GEN_RANDOM_UUID(), 'b231a846-7d40-5100-ba29-b9c0ca0ef9aa', 'ee000001-0000-0000-0003-000000000009', 'AB-12-CD', 0.9821, 'entry', NOW() - INTERVAL '8 hours', '{}'),
(GEN_RANDOM_UUID(), 'b231a846-7d40-5100-ba29-b9c0ca0ef9aa', 'ee000001-0000-0000-0003-000000000001', 'EF-34-GH', 0.9453, 'entry', NOW() - INTERVAL '7 hours 45 minutes', '{}'),
(GEN_RANDOM_UUID(), 'b231a846-7d40-5100-ba29-b9c0ca0ef9aa', 'ee000001-0000-0000-0003-000000000002', 'IJ-56-KL', 0.9102, 'entry', NOW() - INTERVAL '7 hours 30 minutes', '{}'),
(GEN_RANDOM_UUID(), 'b231a846-7d40-5100-ba29-b9c0ca0ef9aa', 'ee000001-0000-0000-0003-000000000003', 'MN-78-OP', 0.8874, 'entry', NOW() - INTERVAL '7 hours', '{}'),
(GEN_RANDOM_UUID(), 'b231a846-7d40-5100-ba29-b9c0ca0ef9aa', 'ee000001-0000-0000-0003-000000000004', 'QR-90-ST', 0.9650, 'entry', NOW() - INTERVAL '6 hours 30 minutes', '{}'),
(GEN_RANDOM_UUID(), 'b231a846-7d40-5100-ba29-b9c0ca0ef9aa', 'ee000001-0000-0000-0003-000000000009', 'AB-12-CD', 0.9735, 'exit', NOW() - INTERVAL '4 hours', '{}'),
(GEN_RANDOM_UUID(), 'b231a846-7d40-5100-ba29-b9c0ca0ef9aa', 'ee000001-0000-0000-0003-000000000001', 'EF-34-GH', 0.9201, 'exit', NOW() - INTERVAL '3 hours 45 minutes', '{}'),
(GEN_RANDOM_UUID(), 'b231a846-7d40-5100-ba29-b9c0ca0ef9aa', 'ee000001-0000-0000-0003-000000000002', 'IJ-56-KL', 0.8990, 'entry', NOW() - INTERVAL '1 hour 15 minutes', '{}'),
(GEN_RANDOM_UUID(), 'ee000001-0000-0000-0000-000000000001', 'ee000001-0000-0000-0003-000000000005', 'MN-78-OP', 0.9312, 'entry', NOW() - INTERVAL '5 hours', '{}'),
(GEN_RANDOM_UUID(), 'ee000001-0000-0000-0000-000000000001', 'ee000001-0000-0000-0003-000000000006', 'QR-90-ST', 0.9780, 'entry', NOW() - INTERVAL '4 hours 30 minutes', '{}'),
(GEN_RANDOM_UUID(), 'ee000001-0000-0000-0000-000000000001', 'ee000001-0000-0000-0003-000000000005', 'MN-78-OP', 0.9444, 'exit', NOW() - INTERVAL '2 hours', '{}'),
(GEN_RANDOM_UUID(), 'ee000001-0000-0000-0000-000000000001', 'ee000001-0000-0000-0003-000000000006', 'QR-90-ST', 0.9603, 'exit', NOW() - INTERVAL '1 hour', '{}')
ON CONFLICT DO NOTHING;

COMMIT;
