-- OCR realism seed:
-- 1) Increase real registered vehicles with modern PT plate formats
--    (AA-00-AA and 00-AA-00), associated with real DRIVER users.
-- 2) Generate OCR flow across ALL existing parks.

BEGIN;

-- -----------------------------------------------------------------------------
-- A) Increase registered vehicles in PostgreSQL (real users, real DB entities)
-- -----------------------------------------------------------------------------
WITH driver_users AS (
    SELECT
        id,
        ROW_NUMBER() OVER (ORDER BY id) AS rn
    FROM users
    WHERE role = 'DRIVER'
),

driver_count AS (
    SELECT COUNT(*) AS cnt FROM driver_users
),

plate_pool AS (
    SELECT
        seq,
        plate
    FROM (
        VALUES
        -- AA-00-AA (new format, 2020+)
        (1, 'AA-10-AB'),
        (2, 'BA-21-CD'),
        (3, 'CA-32-EF'),
        (4, 'DA-43-GH'),
        (5, 'EA-54-IJ'),
        (6, 'FA-65-KL'),
        (7, 'GA-76-MN'),
        (8, 'HA-87-OP'),
        (9, 'IA-98-QR'),
        (10, 'JA-09-ST'),
        (11, 'KA-11-UV'),
        (12, 'LA-22-WX'),
        (13, 'MA-33-YZ'),
        (14, 'NA-44-BC'),
        (15, 'PA-55-DE'),
        (16, 'RA-66-FG'),
        (17, 'SA-77-HJ'),
        (18, 'TA-88-KL'),

        -- 00-AA-00 (2005-2013)
        (19, '10-AB-21'),
        (20, '22-CD-32'),
        (21, '34-EF-43'),
        (22, '45-GH-54'),
        (23, '56-IJ-65'),
        (24, '67-KL-76'),
        (25, '78-MN-87'),
        (26, '89-OP-98'),
        (27, '90-QR-09'),
        (28, '11-ST-20'),
        (29, '23-UV-31'),
        (30, '35-WX-42'),
        (31, '47-YZ-53'),
        (32, '58-BC-64'),
        (33, '69-DE-75'),
        (34, '70-FG-86'),
        (35, '81-HJ-97'),
        (36, '92-KL-18')
    ) AS t (seq, plate)
),

assigned AS (
    SELECT
        p.seq,
        p.plate,
        u.id AS user_id
    FROM plate_pool AS p
    CROSS JOIN driver_count AS dc
    INNER JOIN driver_users AS u
        ON
            dc.cnt > 0
            AND ((p.seq - 1) % dc.cnt) + 1 = u.rn
)

INSERT INTO vehicles (
    user_id,
    plate,
    make,
    model,
    year,
    fuel_type,
    is_primary,
    is_ev,
    is_accessible,
    id,
    created_at,
    updated_at
)
SELECT
    a.user_id,
    a.plate,
    CASE
        WHEN a.seq % 3 = 0 THEN 'Renault'
        WHEN a.seq % 3 = 1 THEN 'Peugeot'
        ELSE 'Volkswagen'
    END AS make,
    CASE
        WHEN a.seq % 3 = 0 THEN 'Clio'
        WHEN a.seq % 3 = 1 THEN '208'
        ELSE 'Golf'
    END AS model,
    2018 + (a.seq % 8) AS year,
    CASE
        WHEN a.seq % 5 = 0 THEN 'ELECTRIC'
        WHEN a.seq % 4 = 0 THEN 'HYBRID'
        ELSE 'GASOLINE'
    END AS fuel_type,
    FALSE AS is_primary,
    (a.seq % 5 = 0) AS is_ev,
    FALSE AS is_accessible,
    GEN_RANDOM_UUID() AS id,
    NOW() AS created_at,
    NOW() AS updated_at
FROM assigned AS a
ON CONFLICT (plate) DO NOTHING;

-- -----------------------------------------------------------------------------
-- B) OCR reads across ALL parks (TimescaleDB hypertable ocr_plate_reads)
-- -----------------------------------------------------------------------------
WITH park_list AS (
    SELECT
        id AS park_id,
        ROW_NUMBER() OVER (ORDER BY id) AS park_seq
    FROM parking_lots
),

spot_ranked AS (
    SELECT
        s.id AS spot_id,
        s.parking_lot_id AS park_id,
        ROW_NUMBER() OVER (
            PARTITION BY s.parking_lot_id
            ORDER BY s.spot_row, s.spot_col, s.id
        ) AS spot_seq
    FROM parking_spots AS s
),

spot_selection AS (
    -- Use first 2 spots per park for stable, broad flow across all parks.
    SELECT
        p.park_id,
        p.park_seq,
        sr.spot_id,
        sr.spot_seq,
        ROW_NUMBER() OVER (ORDER BY p.park_seq, sr.spot_seq) AS global_seq
    FROM park_list AS p
    LEFT JOIN spot_ranked AS sr
        ON
            p.park_id = sr.park_id
            AND sr.spot_seq <= 2
),

vehicle_pool AS (
    SELECT
        plate,
        ROW_NUMBER() OVER (ORDER BY plate) AS plate_seq
    FROM vehicles
),

vehicle_count AS (
    SELECT COUNT(*) AS cnt FROM vehicle_pool
),

event_templates AS (
    SELECT
        event_seq,
        direction,
        offset_minutes
    FROM (
        VALUES
        (1, 'entry', -480),
        (2, 'entry', -420),
        (3, 'exit', -360),
        (4, 'entry', -180),
        (5, 'exit', -60)
    ) AS e (event_seq, direction, offset_minutes)
),

final_events AS (
    SELECT
        ss.park_id,
        ss.spot_id,
        vp.plate,
        et.direction,
        (
            0.82 + ((ss.global_seq + et.event_seq) % 18) * 0.01
        )::double precision AS confidence,
        (NOW() + (et.offset_minutes * interval '1 minute')) AS occurred_at,
        JSONB_BUILD_OBJECT(
            'source', 'seed',
            'scenario', 'ocr_all_parks',
            'parkSeq', ss.park_seq,
            'spotSeq', ss.spot_seq,
            'eventSeq', et.event_seq
        ) AS extra,
        GEN_RANDOM_UUID() AS id
    FROM spot_selection AS ss
    CROSS JOIN event_templates AS et
    CROSS JOIN vehicle_count AS vc
    INNER JOIN vehicle_pool AS vp
        ON
            vc.cnt > 0
            AND ((ss.global_seq + et.event_seq - 1) % vc.cnt) + 1 = vp.plate_seq
    WHERE ss.spot_id IS NOT NULL
)

INSERT INTO ocr_plate_reads (
    park_id,
    spot_id,
    plate,
    direction,
    confidence,
    occurred_at,
    extra,
    id
)
SELECT
    park_id,
    spot_id,
    plate,
    direction,
    confidence,
    occurred_at,
    extra,
    id
FROM final_events
ON CONFLICT DO NOTHING;

COMMIT;
