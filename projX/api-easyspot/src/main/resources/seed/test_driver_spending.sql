-- Postgres seed: vehicles for driver@easyspot.local (463c3f1a)
-- and test_driver@easyspot.pt
-- Sessions inserted separately in test_driver_sessions_timescale.sql

INSERT INTO vehicles (
    id, user_id, plate, make, model, year, fuel_type,
    is_primary, is_ev, is_accessible, created_at, updated_at
)
VALUES (
    'aaaaaaaa-1111-1111-1111-111111111111',
    '463c3f1a-4b25-46dd-8a1b-7942b4e2e6e4',
    'EV20LOCAL', 'Tesla', 'Model 3', 2024, 'ELECTRIC', TRUE, TRUE, FALSE,
    NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;
