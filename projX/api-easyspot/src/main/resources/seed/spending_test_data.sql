-- Postgres seed for US#4: users and vehicles for test_driver
-- (driver@easyspot.pt)

INSERT INTO users (
    id, authentik_user_id, email, name, role, driver_type,
    notifications_enabled, push_notifications_enabled,
    email_notifications_enabled, created_at, updated_at
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'auth0|test-user-id',
    'driver@easyspot.pt',
    'Martim Gil',
    'DRIVER', 'EV',
    TRUE, TRUE, TRUE,
    NOW() - INTERVAL '90 days', NOW()
) ON CONFLICT DO NOTHING;

INSERT INTO vehicles (
    id, user_id, plate, make, model, year, fuel_type,
    is_primary, is_ev, is_accessible, created_at, updated_at
)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'EV-01-AA', 'Tesla', 'Model 3', 2023, 'ELECTRIC', TRUE, TRUE, FALSE,
    NOW() - INTERVAL '90 days', NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO vehicles (
    id, user_id, plate, make, model, year, fuel_type,
    is_primary, is_ev, is_accessible, created_at, updated_at
)
VALUES (
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'AA-00-ZZ', 'Seat', 'Ibiza', 2020, 'DIESEL', FALSE, FALSE, FALSE,
    NOW() - INTERVAL '90 days', NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO vehicles (
    id, user_id, plate, make, model, year, fuel_type,
    is_primary, is_ev, is_accessible, created_at, updated_at
)
VALUES (
    '44444444-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111111',
    'HB-22-XY', 'Toyota', 'Yaris', 2021, 'HYBRID', FALSE, FALSE, FALSE,
    NOW() - INTERVAL '90 days', NOW()
) ON CONFLICT (id) DO NOTHING;
