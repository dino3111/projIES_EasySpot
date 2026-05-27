-- TimescaleDB seed: parking sessions for driver@easyspot.local
-- User UUID is fixed (463c3f1a); vehicle aaaaaaaa created
-- in test_driver_spending.sql

DELETE FROM parking_sessions
WHERE user_id = '463c3f1a-4b25-46dd-8a1b-7942b4e2e6e4';

INSERT INTO parking_sessions (
    id, user_id, parking_lot_id, vehicle_id, zone_type, entry_time, exit_time,
    revenue_euros
)
VALUES (
    GEN_RANDOM_UUID(),
    '463c3f1a-4b25-46dd-8a1b-7942b4e2e6e4',
    'b231a846-7d40-5100-ba29-b9c0ca0ef9aa',
    'aaaaaaaa-1111-1111-1111-111111111111',
    'EV',
    NOW() - INTERVAL '2 days' - INTERVAL '2 hours',
    NOW() - INTERVAL '2 days',
    8.50
);

INSERT INTO parking_sessions (
    id, user_id, parking_lot_id, vehicle_id, zone_type, entry_time, exit_time,
    revenue_euros
)
VALUES (
    GEN_RANDOM_UUID(),
    '463c3f1a-4b25-46dd-8a1b-7942b4e2e6e4',
    '4731819f-a806-5c1f-be8c-a478d4276840',
    'aaaaaaaa-1111-1111-1111-111111111111',
    'EV',
    NOW() - INTERVAL '10 days' - INTERVAL '90 minutes',
    NOW() - INTERVAL '10 days',
    6.75
);
