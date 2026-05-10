-- TimescaleDB seed for US#4: parking sessions for driver@easyspot.pt
-- (user 11111111)
-- Parking lots: b231a846 Coimbra, 452ed8eb Coimbra, 4731819f Aveiro,
-- d8085d8f Aveiro, 6d139aed Ovar
-- Vehicles: 22222222 Tesla EV-01-AA, 33333333 Seat AA-00-ZZ,
-- 44444444 Toyota HB-22-XY

DELETE FROM parking_sessions
WHERE user_id = '11111111-1111-1111-1111-111111111111';

INSERT INTO parking_sessions (
    id, user_id, parking_lot_id, vehicle_id, zone_type, entry_time, exit_time,
    revenue_euros
)
VALUES (
    GEN_RANDOM_UUID(),
    '11111111-1111-1111-1111-111111111111',
    '4731819f-a806-5c1f-be8c-a478d4276840',
    '22222222-2222-2222-2222-222222222222',
    'EV',
    NOW() - INTERVAL '1 day' - INTERVAL '90 minutes',
    NOW() - INTERVAL '1 day',
    7.20
);

INSERT INTO parking_sessions (
    id, user_id, parking_lot_id, vehicle_id, zone_type, entry_time, exit_time,
    revenue_euros
)
VALUES (
    GEN_RANDOM_UUID(),
    '11111111-1111-1111-1111-111111111111',
    'b231a846-7d40-5100-ba29-b9c0ca0ef9aa',
    '33333333-3333-3333-3333-333333333333',
    'STANDARD',
    NOW() - INTERVAL '2 days' - INTERVAL '2 hours',
    NOW() - INTERVAL '2 days',
    3.60
);

INSERT INTO parking_sessions (
    id, user_id, parking_lot_id, vehicle_id, zone_type, entry_time, exit_time,
    revenue_euros
)
VALUES (
    GEN_RANDOM_UUID(),
    '11111111-1111-1111-1111-111111111111',
    '452ed8eb-d0a3-5d61-8428-572e946614a5',
    '44444444-4444-4444-4444-444444444444',
    'STANDARD',
    NOW() - INTERVAL '4 days' - INTERVAL '45 minutes',
    NOW() - INTERVAL '4 days',
    1.35
);

INSERT INTO parking_sessions (
    id, user_id, parking_lot_id, vehicle_id, zone_type, entry_time, exit_time,
    revenue_euros
)
VALUES (
    GEN_RANDOM_UUID(),
    '11111111-1111-1111-1111-111111111111',
    'd8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43',
    '22222222-2222-2222-2222-222222222222',
    'EV',
    NOW() - INTERVAL '6 days' - INTERVAL '2 hours',
    NOW() - INTERVAL '6 days',
    9.80
);

INSERT INTO parking_sessions (
    id, user_id, parking_lot_id, vehicle_id, zone_type, entry_time, exit_time,
    revenue_euros
)
VALUES (
    GEN_RANDOM_UUID(),
    '11111111-1111-1111-1111-111111111111',
    '4731819f-a806-5c1f-be8c-a478d4276840',
    '33333333-3333-3333-3333-333333333333',
    'STANDARD',
    NOW() - INTERVAL '9 days' - INTERVAL '1 hour',
    NOW() - INTERVAL '9 days',
    1.80
);

INSERT INTO parking_sessions (
    id, user_id, parking_lot_id, vehicle_id, zone_type, entry_time, exit_time,
    revenue_euros
)
VALUES (
    GEN_RANDOM_UUID(),
    '11111111-1111-1111-1111-111111111111',
    '6d139aed-f62a-5899-a42a-d3088fd3408b',
    '44444444-4444-4444-4444-444444444444',
    'STANDARD',
    NOW() - INTERVAL '12 days' - INTERVAL '3 hours',
    NOW() - INTERVAL '12 days',
    2.70
);

INSERT INTO parking_sessions (
    id, user_id, parking_lot_id, vehicle_id, zone_type, entry_time, exit_time,
    revenue_euros
)
VALUES (
    GEN_RANDOM_UUID(),
    '11111111-1111-1111-1111-111111111111',
    '452ed8eb-d0a3-5d61-8428-572e946614a5',
    '33333333-3333-3333-3333-333333333333',
    'STANDARD',
    NOW() - INTERVAL '15 days' - INTERVAL '150 minutes',
    NOW() - INTERVAL '15 days',
    4.50
);

INSERT INTO parking_sessions (
    id, user_id, parking_lot_id, vehicle_id, zone_type, entry_time, exit_time,
    revenue_euros
)
VALUES (
    GEN_RANDOM_UUID(),
    '11111111-1111-1111-1111-111111111111',
    'd8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43',
    '22222222-2222-2222-2222-222222222222',
    'EV',
    NOW() - INTERVAL '18 days' - INTERVAL '1 hour',
    NOW() - INTERVAL '18 days',
    4.90
);

INSERT INTO parking_sessions (
    id, user_id, parking_lot_id, vehicle_id, zone_type, entry_time, exit_time,
    revenue_euros
)
VALUES (
    GEN_RANDOM_UUID(),
    '11111111-1111-1111-1111-111111111111',
    'b231a846-7d40-5100-ba29-b9c0ca0ef9aa',
    '44444444-4444-4444-4444-444444444444',
    'STANDARD',
    NOW() - INTERVAL '20 days' - INTERVAL '4 hours',
    NOW() - INTERVAL '20 days',
    7.20
);

INSERT INTO parking_sessions (
    id, user_id, parking_lot_id, vehicle_id, zone_type, entry_time, exit_time,
    revenue_euros
)
VALUES (
    GEN_RANDOM_UUID(),
    '11111111-1111-1111-1111-111111111111',
    '4731819f-a806-5c1f-be8c-a478d4276840',
    '22222222-2222-2222-2222-222222222222',
    'EV',
    NOW() - INTERVAL '23 days' - INTERVAL '135 minutes',
    NOW() - INTERVAL '23 days',
    10.80
);

INSERT INTO parking_sessions (
    id, user_id, parking_lot_id, vehicle_id, zone_type, entry_time, exit_time,
    revenue_euros
)
VALUES (
    GEN_RANDOM_UUID(),
    '11111111-1111-1111-1111-111111111111',
    '6d139aed-f62a-5899-a42a-d3088fd3408b',
    '33333333-3333-3333-3333-333333333333',
    'STANDARD',
    NOW() - INTERVAL '27 days' - INTERVAL '30 minutes',
    NOW() - INTERVAL '27 days',
    0.90
);

INSERT INTO parking_sessions (
    id, user_id, parking_lot_id, vehicle_id, zone_type, entry_time, exit_time,
    revenue_euros
)
VALUES (
    GEN_RANDOM_UUID(),
    '11111111-1111-1111-1111-111111111111',
    '452ed8eb-d0a3-5d61-8428-572e946614a5',
    '44444444-4444-4444-4444-444444444444',
    'STANDARD',
    NOW() - INTERVAL '35 days' - INTERVAL '90 minutes',
    NOW() - INTERVAL '35 days',
    2.70
);

INSERT INTO parking_sessions (
    id, user_id, parking_lot_id, vehicle_id, zone_type, entry_time, exit_time,
    revenue_euros
)
VALUES (
    GEN_RANDOM_UUID(),
    '11111111-1111-1111-1111-111111111111',
    'd8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43',
    '22222222-2222-2222-2222-222222222222',
    'EV',
    NOW() - INTERVAL '42 days' - INTERVAL '3 hours',
    NOW() - INTERVAL '42 days',
    14.70
);

INSERT INTO parking_sessions (
    id, user_id, parking_lot_id, vehicle_id, zone_type, entry_time, exit_time,
    revenue_euros
)
VALUES (
    GEN_RANDOM_UUID(),
    '11111111-1111-1111-1111-111111111111',
    'b231a846-7d40-5100-ba29-b9c0ca0ef9aa',
    '33333333-3333-3333-3333-333333333333',
    'STANDARD',
    NOW() - INTERVAL '50 days' - INTERVAL '1 hour',
    NOW() - INTERVAL '50 days',
    1.80
);

INSERT INTO parking_sessions (
    id, user_id, parking_lot_id, vehicle_id, zone_type, entry_time, exit_time,
    revenue_euros
)
VALUES (
    GEN_RANDOM_UUID(),
    '11111111-1111-1111-1111-111111111111',
    '4731819f-a806-5c1f-be8c-a478d4276840',
    '44444444-4444-4444-4444-444444444444',
    'STANDARD',
    NOW() - INTERVAL '58 days' - INTERVAL '2 hours',
    NOW() - INTERVAL '58 days',
    3.60
);

INSERT INTO parking_sessions (
    id, user_id, parking_lot_id, vehicle_id, zone_type, entry_time, exit_time,
    revenue_euros
)
VALUES (
    GEN_RANDOM_UUID(),
    '11111111-1111-1111-1111-111111111111',
    '6d139aed-f62a-5899-a42a-d3088fd3408b',
    '33333333-3333-3333-3333-333333333333',
    'STANDARD',
    NOW() - INTERVAL '65 days' - INTERVAL '4 hours',
    NOW() - INTERVAL '65 days',
    3.60
);

INSERT INTO parking_sessions (
    id, user_id, parking_lot_id, vehicle_id, zone_type, entry_time, exit_time,
    revenue_euros
)
VALUES (
    GEN_RANDOM_UUID(),
    '11111111-1111-1111-1111-111111111111',
    '452ed8eb-d0a3-5d61-8428-572e946614a5',
    '44444444-4444-4444-4444-444444444444',
    'STANDARD',
    NOW() - INTERVAL '72 days' - INTERVAL '1 hour',
    NOW() - INTERVAL '72 days',
    1.80
);

INSERT INTO parking_sessions (
    id, user_id, parking_lot_id, vehicle_id, zone_type, entry_time, exit_time,
    revenue_euros
)
VALUES (
    GEN_RANDOM_UUID(),
    '11111111-1111-1111-1111-111111111111',
    'd8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43',
    '22222222-2222-2222-2222-222222222222',
    'EV',
    NOW() - INTERVAL '80 days' - INTERVAL '150 minutes',
    NOW() - INTERVAL '80 days',
    12.25
);

INSERT INTO parking_sessions (
    id, user_id, parking_lot_id, vehicle_id, zone_type, entry_time, exit_time,
    revenue_euros
)
VALUES (
    GEN_RANDOM_UUID(),
    '11111111-1111-1111-1111-111111111111',
    'b231a846-7d40-5100-ba29-b9c0ca0ef9aa',
    '33333333-3333-3333-3333-333333333333',
    'STANDARD',
    NOW() - INTERVAL '88 days' - INTERVAL '3 hours',
    NOW() - INTERVAL '88 days',
    5.40
);
