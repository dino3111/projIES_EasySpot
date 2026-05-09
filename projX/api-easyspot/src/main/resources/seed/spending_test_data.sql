-- Test data for User Story #2: Price Transparency & Planning
-- Includes a test user, a test vehicle, and sample parking sessions for
-- spending analytics.

BEGIN;

-- 1. Create a Test User
INSERT INTO users (
    id,
    authentik_user_id,
    email,
    name,
    role,
    driver_type,
    notifications_enabled,
    push_notifications_enabled,
    email_notifications_enabled,
    created_at,
    updated_at
)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'auth0|test-user-id',
    'driver@easyspot.pt',
    'Martim Gil',
    'DRIVER',
    'STANDARD',
    TRUE,
    TRUE,
    TRUE,
    NOW() - INTERVAL '30 days',
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 2. Create a Test Vehicle
INSERT INTO vehicles (
    id,
    user_id,
    plate,
    brand,
    model,
    year,
    fuel_type,
    is_primary,
    created_at,
    updated_at
)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'AA-00-ZZ',
    'Seat',
    'Ibiza',
    2020,
    'DIESEL',
    TRUE,
    NOW() - INTERVAL '30 days',
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 3. Create Sample Parking Sessions (Past 30 days)
-- We need some sessions to populate the spending charts.
-- Session 1: 5 days ago, Coimbra
INSERT INTO parking_sessions (
    id,
    user_id,
    parking_lot_id,
    vehicle_id,
    zone_type,
    entry_time,
    exit_time,
    revenue_euros
)
VALUES (
    GEN_RANDOM_UUID(),
    '11111111-1111-1111-1111-111111111111',
    'b231a846-7d40-5100-ba29-b9c0ca0ef9aa',
    '22222222-2222-2222-2222-222222222222',
    'STANDARD',
    NOW() - INTERVAL '5 days' - INTERVAL '2 hours',
    NOW() - INTERVAL '5 days',
    3.60
);

-- Session 2: 3 days ago, Coimbra (EV)
INSERT INTO parking_sessions (
    id,
    user_id,
    parking_lot_id,
    vehicle_id,
    zone_type,
    entry_time,
    exit_time,
    revenue_euros
)
VALUES (
    GEN_RANDOM_UUID(),
    '11111111-1111-1111-1111-111111111111',
    'b231a846-7d40-5100-ba29-b9c0ca0ef9aa',
    '22222222-2222-2222-2222-222222222222',
    'EV',
    NOW() - INTERVAL '3 days' - INTERVAL '1 hour',
    NOW() - INTERVAL '3 days',
    5.40
);

-- Session 3: 10 days ago, Coimbra
INSERT INTO parking_sessions (
    id,
    user_id,
    parking_lot_id,
    vehicle_id,
    zone_type,
    entry_time,
    exit_time,
    revenue_euros
)
VALUES (
    GEN_RANDOM_UUID(),
    '11111111-1111-1111-1111-111111111111',
    'b231a846-7d40-5100-ba29-b9c0ca0ef9aa',
    '22222222-2222-2222-2222-222222222222',
    'STANDARD',
    NOW() - INTERVAL '10 days' - INTERVAL '3 hours',
    NOW() - INTERVAL '10 days',
    4.50
);

-- Session 4: 1 day ago, Coimbra
INSERT INTO parking_sessions (
    id,
    user_id,
    parking_lot_id,
    vehicle_id,
    zone_type,
    entry_time,
    exit_time,
    revenue_euros
)
VALUES (
    GEN_RANDOM_UUID(),
    '11111111-1111-1111-1111-111111111111',
    'b231a846-7d40-5100-ba29-b9c0ca0ef9aa',
    '22222222-2222-2222-2222-222222222222',
    'STANDARD',
    NOW() - INTERVAL '1 day' - INTERVAL '30 minutes',
    NOW() - INTERVAL '1 day',
    0.90
);

COMMIT;
