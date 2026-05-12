-- Seed: sensor_registry, reservations, user_favorites, alert_subscriptions
-- Depends on: parking_seed_postgres.sql (parks + spots), test_users_seed.sql (users), test_driver_spending.sql (vehicles)

-- ─────────────────────────────────────────────
-- sensor_registry
-- Sensors for Fórum Aveiro, Glicínias Plaza, Europa and EasySpot EV Hub Aveiro
-- ─────────────────────────────────────────────
INSERT INTO sensor_registry (sensor_id, parking_lot_id, zone, status, last_seen_at, created_at) VALUES
('IR-AV1-A01', '4731819f-a806-5c1f-be8c-a478d4276840', 'Piso 0 – Zona A', 'OPERATIONAL',  NOW() - INTERVAL '2 minutes',  NOW() - INTERVAL '30 days'),
('IR-AV1-A02', '4731819f-a806-5c1f-be8c-a478d4276840', 'Piso 0 – Zona A', 'OPERATIONAL',  NOW() - INTERVAL '1 minute',   NOW() - INTERVAL '30 days'),
('IR-AV1-A03', '4731819f-a806-5c1f-be8c-a478d4276840', 'Piso 0 – Zona A', 'DEGRADED',     NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '30 days'),
('IR-AV1-B01', '4731819f-a806-5c1f-be8c-a478d4276840', 'Piso 0 – Zona B', 'OPERATIONAL',  NOW() - INTERVAL '3 minutes',  NOW() - INTERVAL '30 days'),
('IR-AV1-B02', '4731819f-a806-5c1f-be8c-a478d4276840', 'Piso 0 – Zona B', 'OPERATIONAL',  NOW() - INTERVAL '2 minutes',  NOW() - INTERVAL '30 days'),
('IR-AV1-B07', '4731819f-a806-5c1f-be8c-a478d4276840', 'Piso 0 – Zona B', 'OFFLINE',      NOW() - INTERVAL '2 hours',    NOW() - INTERVAL '30 days'),
('IR-AV2-A01', 'd8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43', 'Piso -1',         'OPERATIONAL',  NOW() - INTERVAL '1 minute',   NOW() - INTERVAL '25 days'),
('IR-AV2-A02', 'd8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43', 'Piso -1',         'OPERATIONAL',  NOW() - INTERVAL '4 minutes',  NOW() - INTERVAL '25 days'),
('IR-AV2-B01', 'd8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43', 'Piso 0',          'MAINTENANCE',  NOW() - INTERVAL '1 day',      NOW() - INTERVAL '25 days'),
('IR-LE1-A01', '070b4f4d-9a9e-5c4a-92bd-eae711ecb6b3', 'Piso 0',          'OPERATIONAL',  NOW() - INTERVAL '2 minutes',  NOW() - INTERVAL '20 days'),
('IR-LE1-A02', '070b4f4d-9a9e-5c4a-92bd-eae711ecb6b3', 'Piso 0',          'OPERATIONAL',  NOW() - INTERVAL '3 minutes',  NOW() - INTERVAL '20 days'),
('IR-LE1-B01', '070b4f4d-9a9e-5c4a-92bd-eae711ecb6b3', 'Piso 1',          'DEGRADED',     NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '20 days'),
('IR-EV1-A01', 'ee000001-0000-0000-0000-000000000001', 'Zona EV – Piso 0', 'OPERATIONAL',  NOW() - INTERVAL '1 minute',   NOW() - INTERVAL '15 days'),
('IR-EV1-A02', 'ee000001-0000-0000-0000-000000000001', 'Zona EV – Piso 0', 'OPERATIONAL',  NOW() - INTERVAL '2 minutes',  NOW() - INTERVAL '15 days')
ON CONFLICT (sensor_id) DO NOTHING;

-- ─────────────────────────────────────────────
-- reservations
-- driver@easyspot.local (463c3f1a) with vehicle aaaaaaaa-1111
-- parks: Fórum Aveiro, Glicínias Plaza, Europa
-- spots: first free STANDARD spots from each park
-- ─────────────────────────────────────────────
INSERT INTO reservations (
    id, user_id, parking_lot_id, parking_spot_id, vehicle_id,
    arrival_time, departure_time, status, locked_until,
    estimated_cost, booking_code, idempotency_key, created_at, updated_at
) VALUES
(
    'res00001-0000-0000-0000-000000000001',
    '463c3f1a-4b25-46dd-8a1b-7942b4e2e6e4',
    '4731819f-a806-5c1f-be8c-a478d4276840',
    NULL,
    'aaaaaaaa-1111-1111-1111-111111111111',
    NOW() + INTERVAL '1 hour',
    NOW() + INTERVAL '3 hours',
    'CONFIRMED',
    NOW() + INTERVAL '1 hour 30 minutes',
    2.40,
    'BK-AV1-001',
    'idem-driver-res-001',
    NOW(), NOW()
),
(
    'res00002-0000-0000-0000-000000000002',
    '463c3f1a-4b25-46dd-8a1b-7942b4e2e6e4',
    'd8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43',
    NULL,
    'aaaaaaaa-1111-1111-1111-111111111111',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days' + INTERVAL '2 hours',
    'COMPLETED',
    NULL,
    2.40,
    'BK-AV2-001',
    'idem-driver-res-002',
    NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'
),
(
    'res00003-0000-0000-0000-000000000003',
    '463c3f1a-4b25-46dd-8a1b-7942b4e2e6e4',
    '070b4f4d-9a9e-5c4a-92bd-eae711ecb6b3',
    NULL,
    'aaaaaaaa-1111-1111-1111-111111111111',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days' + INTERVAL '1 hour',
    'CANCELLED',
    NULL,
    0.00,
    'BK-LE1-001',
    'idem-driver-res-003',
    NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'
)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────
-- user_favorites
-- driver@easyspot.local favorita Fórum Aveiro e EasySpot EV Hub
-- ─────────────────────────────────────────────
INSERT INTO user_favorites (id, user_id, parking_lot_id, created_at) VALUES
('fav00001-0000-0000-0000-000000000001', '463c3f1a-4b25-46dd-8a1b-7942b4e2e6e4', '4731819f-a806-5c1f-be8c-a478d4276840', NOW() - INTERVAL '10 days'),
('fav00002-0000-0000-0000-000000000002', '463c3f1a-4b25-46dd-8a1b-7942b4e2e6e4', 'ee000001-0000-0000-0000-000000000001', NOW() - INTERVAL '7 days')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────
-- alert_subscriptions
-- test_technical (80de0901) subscreve alertas de sensor para os seus parques
-- test_technical2 (8d1b2b9b) subscreve alertas de sistema
-- driver@easyspot.local subscreve notificação de lugar disponível
-- ─────────────────────────────────────────────
INSERT INTO alert_subscriptions (
    id, user_id, alert_type, park_ids_csv, park_scope_key,
    vehicle_id, email, schedule_frequency, schedule_time, schedule_timezone,
    enabled, created_at
) VALUES
(
    'sub00001-0000-0000-0000-000000000001',
    '80de0901-9dee-4123-b884-d9b2f99891dd',
    'SENSOR_FAULT',
    '4731819f-a806-5c1f-be8c-a478d4276840,d8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43,ee000001-0000-0000-0000-000000000001',
    '4731819f-a806-5c1f-be8c-a478d4276840|d8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43|ee000001-0000-0000-0000-000000000001',
    NULL,
    'technical@easyspot.local',
    NULL, NULL, NULL,
    TRUE, NOW() - INTERVAL '20 days'
),
(
    'sub00002-0000-0000-0000-000000000002',
    '8d1b2b9b-e5d5-4de7-98c9-ff1d379f3c36',
    'SENSOR_FAULT',
    'b231a846-7d40-5100-ba29-b9c0ca0ef9aa,452ed8eb-d0a3-5d61-8428-572e946614a5,070b4f4d-9a9e-5c4a-92bd-eae711ecb6b3',
    'b231a846-7d40-5100-ba29-b9c0ca0ef9aa|452ed8eb-d0a3-5d61-8428-572e946614a5|070b4f4d-9a9e-5c4a-92bd-eae711ecb6b3',
    NULL,
    'technical2@easyspot.local',
    'DAILY_SUMMARY', '08:00', 'Europe/Lisbon',
    TRUE, NOW() - INTERVAL '15 days'
),
(
    'sub00003-0000-0000-0000-000000000003',
    '463c3f1a-4b25-46dd-8a1b-7942b4e2e6e4',
    'SPACE_AVAILABLE',
    '4731819f-a806-5c1f-be8c-a478d4276840',
    '4731819f-a806-5c1f-be8c-a478d4276840',
    'aaaaaaaa-1111-1111-1111-111111111111',
    'driver@easyspot.local',
    NULL, NULL, NULL,
    TRUE, NOW() - INTERVAL '5 days'
)
ON CONFLICT DO NOTHING;
