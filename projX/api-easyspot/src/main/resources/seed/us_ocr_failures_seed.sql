-- OCR failure scenarios seed (US: Simulate OCR Failures)
-- Each INSERT illustrates one distinct failure mode.
-- failure_mode column distinguishes failures from normal reads.
-- A NULL failure_mode = normal successful read (for contrast).
--
-- Failure modes:
--   UNREADABLE      - camera sees vehicle but cannot extract any plate
--   LOW_CONFIDENCE  - plate read but OCR score < 0.5 (unreliable)
--   WRONG_PLATE     - plate read but format is invalid/garbled
--   CAMERA_OFFLINE  - no camera signal; system registers absence explicitly
--   CAMERA_DEGRADED - camera degraded; plate read with reduced confidence (0.30-0.65)

BEGIN;

WITH park AS (
    SELECT id AS park_id
    FROM parking_lots
    ORDER BY id
    LIMIT 1
),

spot AS (
    SELECT s.id AS spot_id
    FROM parking_spots AS s
    INNER JOIN park AS p
        ON s.parking_lot_id = p.park_id
    ORDER BY
        s.spot_row,
        s.spot_col
    LIMIT 1
),

scenarios AS (
    SELECT
        t.label,
        t.plate,
        t.confidence,
        t.direction,
        t.failure_mode,
        t.minutes_ago
    FROM (
        VALUES
        -- 1. Normal read (baseline - no failure)
        ('normal_entry', 'AA-10-AB', 0.9500, 'entry', NULL::VARCHAR, 120),
        -- 2. UNREADABLE - plate field empty, confidence 0.0
        ('unreadable', '', 0.0000, 'entry', 'UNREADABLE', 110),
        -- 3. LOW_CONFIDENCE - plate present but score too low to trust
        ('low_confidence', 'AA-10-AB', 0.2300, 'exit', 'LOW_CONFIDENCE', 100),
        -- 4. WRONG_PLATE - garbled plate that breaks PT format
        ('wrong_plate', 'A1-10-AB', 0.6100, 'entry', 'WRONG_PLATE', 90),
        -- 5. CAMERA_OFFLINE - no signal, empty plate
        ('camera_offline', '', 0.0000, 'entry', 'CAMERA_OFFLINE', 80),
        -- 6. CAMERA_DEGRADED - plate read but with reduced quality
        ('camera_degraded', 'AA-10-AB', 0.4800, 'exit', 'CAMERA_DEGRADED', 70),
        -- 7. Recovery - normal read after failures (proves recovery works)
        ('recovery_entry', 'BA-21-CD', 0.9200, 'entry', NULL::VARCHAR, 60)
    ) AS t (label, plate, confidence, direction, failure_mode, minutes_ago)
)

INSERT INTO ocr_plate_reads (
    id,
    park_id,
    spot_id,
    plate,
    confidence,
    direction,
    failure_mode,
    occurred_at,
    extra
)
SELECT
    GEN_RANDOM_UUID() AS id,
    p.park_id,
    s.spot_id,
    sc.plate,
    sc.confidence,
    sc.direction,
    sc.failure_mode,
    NOW() - (sc.minutes_ago * INTERVAL '1 minute') AS occurred_at,
    JSONB_BUILD_OBJECT('source', 'seed', 'scenario', sc.label) AS extra
FROM park AS p
CROSS JOIN spot AS s
CROSS JOIN scenarios AS sc
ON CONFLICT DO NOTHING;

COMMIT;
