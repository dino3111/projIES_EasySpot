-- US#10: Real-Time Occupancy & Financial Performance Dashboard
-- Test/seed data for manager dashboard analytics
-- Run after parking_seed_postgres.sql and parking_seed_timescale.sql

BEGIN;

-- Parking sessions (today + last 7 days)

DELETE FROM parking_sessions
WHERE entry_time >= current_date - interval '7 days';

-- Today's sessions — Fórum Aveiro (4731819f-a806-5c1f-be8c-a478d4276840)
INSERT INTO parking_sessions (
    id, parking_lot_id, zone_type, entry_time, exit_time, revenue_euros
)
VALUES
(
    gen_random_uuid(),
    '4731819f-a806-5c1f-be8c-a478d4276840',
    'STANDARD',
    now() - interval '3 hours',
    now() - interval '15 minutes',
    4.50
),
(
    gen_random_uuid(),
    '4731819f-a806-5c1f-be8c-a478d4276840',
    'EV',
    now() - interval '2 hours',
    now() - interval '30 minutes',
    9.22
),
(
    gen_random_uuid(),
    '4731819f-a806-5c1f-be8c-a478d4276840',
    'STANDARD',
    now() - interval '5 hours',
    now() - interval '1 hour',
    6.00
),
(
    gen_random_uuid(),
    '4731819f-a806-5c1f-be8c-a478d4276840',
    'STANDARD',
    now() - interval '1 hour',
    now() - interval '10 minutes',
    1.50
);

-- Today's sessions — Glicínias Plaza (d8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43)
INSERT INTO parking_sessions (
    id, parking_lot_id, zone_type, entry_time, exit_time, revenue_euros
)
VALUES
(
    gen_random_uuid(),
    'd8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43',
    'STANDARD',
    now() - interval '1 hour',
    now() - interval '5 minutes',
    1.00
),
(
    gen_random_uuid(),
    'd8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43',
    'STANDARD',
    now() - interval '2 hours',
    now() - interval '1 hour',
    2.00
),
(
    gen_random_uuid(),
    'd8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43',
    'EV',
    now() - interval '4 hours',
    now() - interval '2 hours',
    2.00
);

-- Today's sessions — Europa / Leiria (070b4f4d-9a9e-5c4a-92bd-eae711ecb6b3)
INSERT INTO parking_sessions (
    id, parking_lot_id, zone_type, entry_time, exit_time, revenue_euros
)
VALUES
(
    gen_random_uuid(),
    '070b4f4d-9a9e-5c4a-92bd-eae711ecb6b3',
    'STANDARD',
    now() - interval '150 minutes',
    now() - interval '30 minutes',
    4.00
),
(
    gen_random_uuid(),
    '070b4f4d-9a9e-5c4a-92bd-eae711ecb6b3',
    'STANDARD',
    now() - interval '90 minutes',
    now() - interval '15 minutes',
    2.40
);

-- Today's sessions — Foz Plaza (62feaf63-aa20-5070-b89f-e81bfd5f47cd)
INSERT INTO parking_sessions (
    id, parking_lot_id, zone_type, entry_time, exit_time, revenue_euros
)
VALUES
(
    gen_random_uuid(),
    '62feaf63-aa20-5070-b89f-e81bfd5f47cd',
    'STANDARD',
    now() - interval '5 hours',
    now() - interval '1 hour',
    6.20
),
(
    gen_random_uuid(),
    '62feaf63-aa20-5070-b89f-e81bfd5f47cd',
    'EV',
    now() - interval '3 hours',
    now() - interval '40 minutes',
    15.00
),
(
    gen_random_uuid(),
    '62feaf63-aa20-5070-b89f-e81bfd5f47cd',
    'STANDARD',
    now() - interval '2 hours',
    now() - interval '30 minutes',
    3.60
);

-- Yesterday's sessions (for variance calculation)
INSERT INTO parking_sessions (
    id, parking_lot_id, zone_type, entry_time, exit_time, revenue_euros
)
VALUES
(
    gen_random_uuid(),
    '4731819f-a806-5c1f-be8c-a478d4276840',
    'STANDARD',
    current_date - interval '1 day' + interval '8 hours',
    current_date - interval '1 day' + interval '11 hours',
    4.50
),
(
    gen_random_uuid(),
    '4731819f-a806-5c1f-be8c-a478d4276840',
    'STANDARD',
    current_date - interval '1 day' + interval '9 hours',
    current_date - interval '1 day' + interval '12 hours',
    4.50
),
(
    gen_random_uuid(),
    'd8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43',
    'STANDARD',
    current_date - interval '1 day' + interval '10 hours',
    current_date - interval '1 day' + interval '13 hours',
    3.00
),
(
    gen_random_uuid(),
    '070b4f4d-9a9e-5c4a-92bd-eae711ecb6b3',
    'STANDARD',
    current_date - interval '1 day' + interval '8 hours',
    current_date - interval '1 day' + interval '10 hours',
    3.20
),
(
    gen_random_uuid(),
    '62feaf63-aa20-5070-b89f-e81bfd5f47cd',
    'STANDARD',
    current_date - interval '1 day' + interval '11 hours',
    current_date - interval '1 day' + interval '16 hours',
    6.00
),
(
    gen_random_uuid(),
    '4731819f-a806-5c1f-be8c-a478d4276840',
    'STANDARD',
    current_date - interval '1 day' + interval '14 hours',
    current_date - interval '1 day' + interval '17 hours',
    4.50
);

-- Sessions for last 7 days (daily metrics chart)
DO $$
DECLARE
    lots UUID[] := ARRAY[
        '4731819f-a806-5c1f-be8c-a478d4276840',
        'd8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43',
        '070b4f4d-9a9e-5c4a-92bd-eae711ecb6b3',
        '62feaf63-aa20-5070-b89f-e81bfd5f47cd',
        'b231a846-7d40-5100-ba29-b9c0ca0ef9aa'
    ];
    lot_id UUID;
    day_offset INT;
    i INT;
    entries INT;
BEGIN
    FOR day_offset IN 2..6 LOOP
        entries := 15 + (day_offset * 5);
        FOR i IN 1..entries LOOP
            lot_id := lots[1 + (i % array_length(lots, 1))];
            INSERT INTO parking_sessions (id, parking_lot_id, zone_type, entry_time, exit_time, revenue_euros)
            VALUES (
                gen_random_uuid(),
                lot_id,
                'STANDARD',
                current_date - (day_offset || ' days')::interval + ((8 + (i % 10)) || ' hours')::interval,
                current_date - (day_offset || ' days')::interval + ((10 + (i % 8)) || ' hours')::interval,
                1.5 + (i % 5) * 0.5
            );
        END LOOP;
    END LOOP;
END $$;

-- Occupancy snapshots for hourly chart (today)

DELETE FROM occupancy_snapshots
WHERE recorded_at >= current_date;

INSERT INTO occupancy_snapshots (
    id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at
)
SELECT
    gen_random_uuid() AS id,
    lot_id,
    zone,
    occ,
    tot,
    current_date + (h || ' hours')::interval AS recorded_at
FROM (
    VALUES
    ('4731819f-a806-5c1f-be8c-a478d4276840'::uuid, 'STANDARD', 15, 80, 7),
    ('4731819f-a806-5c1f-be8c-a478d4276840'::uuid, 'STANDARD', 34, 80, 8),
    ('4731819f-a806-5c1f-be8c-a478d4276840'::uuid, 'STANDARD', 55, 80, 9),
    ('4731819f-a806-5c1f-be8c-a478d4276840'::uuid, 'STANDARD', 62, 80, 10),
    ('4731819f-a806-5c1f-be8c-a478d4276840'::uuid, 'STANDARD', 68, 80, 11),
    ('4731819f-a806-5c1f-be8c-a478d4276840'::uuid, 'STANDARD', 72, 80, 12),
    ('4731819f-a806-5c1f-be8c-a478d4276840'::uuid, 'STANDARD', 65, 80, 13),
    ('4731819f-a806-5c1f-be8c-a478d4276840'::uuid, 'EV', 3, 6, 8),
    ('4731819f-a806-5c1f-be8c-a478d4276840'::uuid, 'EV', 5, 6, 10),
    ('4731819f-a806-5c1f-be8c-a478d4276840'::uuid, 'ACCESSIBLE', 1, 2, 9),
    ('d8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43'::uuid, 'STANDARD', 20, 60, 7),
    ('d8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43'::uuid, 'STANDARD', 40, 60, 9),
    ('d8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43'::uuid, 'STANDARD', 50, 60, 11),
    ('d8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43'::uuid, 'EV', 2, 4, 9),
    ('070b4f4d-9a9e-5c4a-92bd-eae711ecb6b3'::uuid, 'STANDARD', 40, 80, 8),
    ('070b4f4d-9a9e-5c4a-92bd-eae711ecb6b3'::uuid, 'STANDARD', 65, 80, 10),
    ('070b4f4d-9a9e-5c4a-92bd-eae711ecb6b3'::uuid, 'STANDARD', 72, 80, 12),
    ('62feaf63-aa20-5070-b89f-e81bfd5f47cd'::uuid, 'STANDARD', 30, 60, 7),
    ('62feaf63-aa20-5070-b89f-e81bfd5f47cd'::uuid, 'STANDARD', 52, 60, 9),
    ('62feaf63-aa20-5070-b89f-e81bfd5f47cd'::uuid, 'STANDARD', 58, 60, 11),
    ('62feaf63-aa20-5070-b89f-e81bfd5f47cd'::uuid, 'EV', 4, 8, 10),
    ('62feaf63-aa20-5070-b89f-e81bfd5f47cd'::uuid, 'ACCESSIBLE', 2, 3, 10)
) AS t (lot_id, zone, occ, tot, h);

-- Alerts for dashboard recent alerts section

DELETE FROM alerts
WHERE created_at >= current_date - interval '7 days';

INSERT INTO alerts (
    id,
    parking_lot_id,
    parking_lot_name,
    type,
    zone,
    sensor_id,
    plate,
    description,
    severity,
    state,
    created_at,
    attributed_to,
    notes
)
VALUES
(
    gen_random_uuid(),
    '4731819f-a806-5c1f-be8c-a478d4276840',
    'Fórum Aveiro',
    'SENSOR',
    'Piso 0 – Zona B',
    'IR-AV1-B07',
    NULL,
    'Sensor infravermelho não reporta leituras há mais de 2 horas.',
    'CRITICAL',
    'OPEN',
    now() - interval '4 hours',
    NULL,
    NULL
),
(
    gen_random_uuid(),
    'd8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43',
    'Glicínias Plaza',
    'CLIENT',
    'Piso -1',
    NULL,
    '55-AB-23',
    'Condutor reporta cobrança incorreta: cobrado 2h por 45 min.',
    'WARNING',
    'IN_PROGRESS',
    now() - interval '6 hours',
    'Suporte EasySpot',
    'A verificar logs de entrada/saída no sistema OCR.'
),
(
    gen_random_uuid(),
    'b231a846-7d40-5100-ba29-b9c0ca0ef9aa',
    'Estádio Cidade de Coimbra',
    'SENSOR',
    'Piso -1 – Mobilidade Reduzida',
    'IR-CO1-MR02',
    NULL,
    'Sensor do lugar de mobilidade reduzida MR-02 em falha.',
    'CRITICAL',
    'OPEN',
    now() - interval '8 hours',
    NULL,
    NULL
),
(
    gen_random_uuid(),
    '070b4f4d-9a9e-5c4a-92bd-eae711ecb6b3',
    'Europa',
    'SYSTEM',
    NULL,
    NULL,
    NULL,
    'Leitor OCR da entrada principal sem comunicação com o servidor central.',
    'CRITICAL',
    'IN_PROGRESS',
    now() - interval '12 hours',
    'Laura Farias',
    'Técnico a caminho.'
),
(
    gen_random_uuid(),
    '62feaf63-aa20-5070-b89f-e81bfd5f47cd',
    'Foz Plaza',
    'CLIENT',
    NULL,
    NULL,
    '73-CD-98',
    'Lugar EV reservado estava ocupado por veículo convencional.',
    'WARNING',
    'RESOLVED',
    now() - interval '24 hours',
    'Suporte EasySpot',
    'Reembolso processado.'
);

COMMIT;
