-- Super seed for User Story #2 & #3 test data (Multi-email support)
BEGIN;

-- 1. Ensure both potential test driver emails exist and are synced
-- Account 1: From bootstrap script
INSERT INTO users (id, authentik_user_id, email, name, role, driver_type, notifications_enabled, push_notifications_enabled, email_notifications_enabled, created_at, updated_at)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'auth0|test-user-id-1', 
  'driver@easyspot.local',
  'Condutor de Teste (Local)',
  'DRIVER',
  'EV',
  true, true, true,
  NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Account 2: The one you mentioned
INSERT INTO users (id, authentik_user_id, email, name, role, driver_type, notifications_enabled, push_notifications_enabled, email_notifications_enabled, created_at, updated_at)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'auth0|test-user-id-2', 
  'test_driver@easyspot.pt',
  'Condutor de Teste (PT)',
  'DRIVER',
  'EV',
  true, true, true,
  NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 2. Ensure vehicles exist for both
INSERT INTO vehicles (id, user_id, plate, brand, model, year, fuel_type, is_primary, created_at, updated_at)
VALUES (
  '33333333-3333-3333-3333-333333333333', 
  '11111111-1111-1111-1111-111111111111', 
  'EV-20-LOCAL', 'Tesla', 'Model 3', 2024, 'ELECTRIC', true, NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO vehicles (id, user_id, plate, brand, model, year, fuel_type, is_primary, created_at, updated_at)
VALUES (
  '44444444-4444-4444-4444-444444444444', 
  '22222222-2222-2222-2222-222222222222', 
  'EV-20-PT', 'Tesla', 'Model Y', 2024, 'ELECTRIC', true, NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- 3. Create Sample Parking Sessions for both
DELETE FROM parking_sessions WHERE user_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

-- Sessions for driver@easyspot.local
INSERT INTO parking_sessions (id, user_id, parking_lot_id, vehicle_id, zone_type, entry_time, exit_time, revenue_euros)
VALUES (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'b231a846-7d40-5100-ba29-b9c0ca0ef9aa', '33333333-3333-3333-3333-333333333333', 'EV', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '2 hours', 8.50);

-- Sessions for test_driver@easyspot.pt
INSERT INTO parking_sessions (id, user_id, parking_lot_id, vehicle_id, zone_type, entry_time, exit_time, revenue_euros)
VALUES (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'b231a846-7d40-5100-ba29-b9c0ca0ef9aa', '44444444-4444-4444-4444-444444444444', 'EV', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '3 hours', 12.00);

COMMIT;
