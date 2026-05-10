BEGIN;
DELETE FROM occupancy_snapshots;

-- Current snapshots (latest state)
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES (gen_random_uuid(), '070b4f4d-9a9e-5c4a-92bd-eae711ecb6b3', 'ACCESSIBLE', 1, 1, NOW());
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES (gen_random_uuid(), '070b4f4d-9a9e-5c4a-92bd-eae711ecb6b3', 'STANDARD', 179, 179, NOW());
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES (gen_random_uuid(), '33cce245-2bff-5ad3-9cf4-5b6abf1076b4', 'ACCESSIBLE', 1, 1, NOW());
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES (gen_random_uuid(), '33cce245-2bff-5ad3-9cf4-5b6abf1076b4', 'RESERVED', 1, 1, NOW());
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES (gen_random_uuid(), '33cce245-2bff-5ad3-9cf4-5b6abf1076b4', 'STANDARD', 135, 138, NOW());
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES (gen_random_uuid(), '452ed8eb-d0a3-5d61-8428-572e946614a5', 'ACCESSIBLE', 1, 1, NOW());
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES (gen_random_uuid(), '452ed8eb-d0a3-5d61-8428-572e946614a5', 'STANDARD', 107, 119, NOW());
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES (gen_random_uuid(), '4731819f-a806-5c1f-be8c-a478d4276840', 'ACCESSIBLE', 1, 1, NOW());
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES (gen_random_uuid(), '4731819f-a806-5c1f-be8c-a478d4276840', 'EV', 1, 1, NOW());
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES (gen_random_uuid(), '4731819f-a806-5c1f-be8c-a478d4276840', 'RESERVED', 2, 2, NOW());
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES (gen_random_uuid(), '4731819f-a806-5c1f-be8c-a478d4276840', 'STANDARD', 125, 166, NOW());
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES (gen_random_uuid(), '617dd647-6d08-52b2-95d3-9b4a4e002b6e', 'ACCESSIBLE', 1, 1, NOW());
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES (gen_random_uuid(), '617dd647-6d08-52b2-95d3-9b4a4e002b6e', 'STANDARD', 119, 199, NOW());
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES (gen_random_uuid(), '62feaf63-aa20-5070-b89f-e81bfd5f47cd', 'ACCESSIBLE', 1, 1, NOW());
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES (gen_random_uuid(), '62feaf63-aa20-5070-b89f-e81bfd5f47cd', 'EV', 1, 1, NOW());
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES (gen_random_uuid(), '62feaf63-aa20-5070-b89f-e81bfd5f47cd', 'STANDARD', 224, 498, NOW());
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES (gen_random_uuid(), '6d139aed-f62a-5899-a42a-d3088fd3408b', 'STANDARD', 29, 96, NOW());
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES (gen_random_uuid(), '7021e6fc-7585-5463-bbb7-de9bb8f4c37b', 'ACCESSIBLE', 0, 1, NOW());
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES (gen_random_uuid(), '7021e6fc-7585-5463-bbb7-de9bb8f4c37b', 'EV', 0, 1, NOW());
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES (gen_random_uuid(), '7021e6fc-7585-5463-bbb7-de9bb8f4c37b', 'STANDARD', 90, 598, NOW());
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES (gen_random_uuid(), 'b231a846-7d40-5100-ba29-b9c0ca0ef9aa', 'ACCESSIBLE', 1, 1, NOW());
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES (gen_random_uuid(), 'b231a846-7d40-5100-ba29-b9c0ca0ef9aa', 'EV', 2, 2, NOW());
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES (gen_random_uuid(), 'b231a846-7d40-5100-ba29-b9c0ca0ef9aa', 'RESERVED', 2, 2, NOW());
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES (gen_random_uuid(), 'b231a846-7d40-5100-ba29-b9c0ca0ef9aa', 'STANDARD', 115, 115, NOW());
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES (gen_random_uuid(), 'c7c34eb2-d620-5fd6-a565-f04d9ec8b52a', 'ACCESSIBLE', 1, 1, NOW());
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES (gen_random_uuid(), 'c7c34eb2-d620-5fd6-a565-f04d9ec8b52a', 'EV', 1, 1, NOW());
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES (gen_random_uuid(), 'c7c34eb2-d620-5fd6-a565-f04d9ec8b52a', 'RESERVED', 2, 2, NOW());
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES (gen_random_uuid(), 'c7c34eb2-d620-5fd6-a565-f04d9ec8b52a', 'STANDARD', 231, 236, NOW());
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES (gen_random_uuid(), 'cd48f90c-637d-5f26-966a-73e1dd6baf98', 'ACCESSIBLE', 1, 1, NOW());
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES (gen_random_uuid(), 'cd48f90c-637d-5f26-966a-73e1dd6baf98', 'EV', 1, 1, NOW());
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES (gen_random_uuid(), 'cd48f90c-637d-5f26-966a-73e1dd6baf98', 'STANDARD', 106, 118, NOW());
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES (gen_random_uuid(), 'd8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43', 'ACCESSIBLE', 1, 1, NOW());
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES (gen_random_uuid(), 'd8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43', 'EV', 1, 1, NOW());
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at) VALUES (gen_random_uuid(), 'd8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43', 'STANDARD', 336, 448, NOW());

-- Historical snapshots for the last 7 days to power hourly occupancy trend charts.
-- Pattern by hour (0-23): low at night, rising 8-9h, peak 10-13h, high 15-18h, falling 19-23h.
-- Uses generate_series + CASE so Spring ScriptUtils can execute without PL/pgSQL blocks.
INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at)
SELECT
  gen_random_uuid(),
  l.lot_id,
  'STANDARD',
  GREATEST(0, LEAST(l.total_spaces,
    (l.total_spaces * (
      CASE h
        WHEN 0  THEN 10 WHEN 1  THEN 8  WHEN 2  THEN 6  WHEN 3  THEN 5
        WHEN 4  THEN 5  WHEN 5  THEN 8  WHEN 6  THEN 15 WHEN 7  THEN 35
        WHEN 8  THEN 65 WHEN 9  THEN 82 WHEN 10 THEN 88 WHEN 11 THEN 90
        WHEN 12 THEN 88 WHEN 13 THEN 80 WHEN 14 THEN 85 WHEN 15 THEN 90
        WHEN 16 THEN 88 WHEN 17 THEN 75 WHEN 18 THEN 55 WHEN 19 THEN 40
        WHEN 20 THEN 30 WHEN 21 THEN 22 WHEN 22 THEN 18 ELSE 14
      END + (RANDOM() * 10 - 5)::INT
    ) / 100)::INT
  )),
  l.total_spaces,
  NOW() - (d || ' days')::INTERVAL + (h || ' hours')::INTERVAL
FROM
  generate_series(1, 7) AS d,
  generate_series(0, 23) AS h,
  (VALUES
    ('b231a846-7d40-5100-ba29-b9c0ca0ef9aa'::UUID, 120),
    ('c7c34eb2-d620-5fd6-a565-f04d9ec8b52a'::UUID, 236),
    ('4731819f-a806-5c1f-be8c-a478d4276840'::UUID, 166),
    ('62feaf63-aa20-5070-b89f-e81bfd5f47cd'::UUID, 498),
    ('7021e6fc-7585-5463-bbb7-de9bb8f4c37b'::UUID, 598),
    ('617dd647-6d08-52b2-95d3-9b4a4e002b6e'::UUID, 199)
  ) AS l(lot_id, total_spaces);

COMMIT;
