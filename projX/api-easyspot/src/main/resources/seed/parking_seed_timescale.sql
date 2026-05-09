-- Time-series seed for occupancy snapshots (TimescaleDB hypertable).
-- Self-contained with real IDs to avoid cross-DB join issues in initialization.

BEGIN;

DELETE FROM occupancy_snapshots;

-- Estádio Cidade de Coimbra (b231a846-7d40-5100-ba29-b9c0ca0ef9aa)
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES 
(gen_random_uuid(), 'b231a846-7d40-5100-ba29-b9c0ca0ef9aa', 'STANDARD', 50, 100, NOW()),
(gen_random_uuid(), 'b231a846-7d40-5100-ba29-b9c0ca0ef9aa', 'EV', 2, 10, NOW()),
(gen_random_uuid(), 'b231a846-7d40-5100-ba29-b9c0ca0ef9aa', 'ACCESSIBLE', 1, 10, NOW());

-- CoimbraShopping (452ed8eb-d0a3-5d61-8428-572e946614a5)
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES 
(gen_random_uuid(), '452ed8eb-d0a3-5d61-8428-572e946614a5', 'STANDARD', 20, 50, NOW()),
(gen_random_uuid(), '452ed8eb-d0a3-5d61-8428-572e946614a5', 'ACCESSIBLE', 0, 10, NOW());

-- Fórum Aveiro (4731819f-a806-5c1f-be8c-a478d4276840)
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES 
(gen_random_uuid(), '4731819f-a806-5c1f-be8c-a478d4276840', 'STANDARD', 30, 80, NOW()),
(gen_random_uuid(), '4731819f-a806-5c1f-be8c-a478d4276840', 'EV', 1, 5, NOW());

-- Glicínias Plaza (d8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43)
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES 
(gen_random_uuid(), 'd8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43', 'STANDARD', 60, 150, NOW()),
(gen_random_uuid(), 'd8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43', 'EV', 2, 5, NOW()),
(gen_random_uuid(), 'd8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43', 'ACCESSIBLE', 1, 5, NOW());

-- Europa (070b4f4d-9a9e-5c4a-92bd-eae711ecb6b3)
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES 
(gen_random_uuid(), '070b4f4d-9a9e-5c4a-92bd-eae711ecb6b3', 'STANDARD', 40, 90, NOW());

-- Estádio Municipal Dr. Magalhães Pessoa (7021e6fc-7585-5463-bbb7-de9bb8f4c37b)
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES 
(gen_random_uuid(), '7021e6fc-7585-5463-bbb7-de9bb8f4c37b', 'STANDARD', 100, 300, NOW());

COMMIT;
