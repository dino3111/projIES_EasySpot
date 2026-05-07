-- Time-series seed for occupancy snapshots (TimescaleDB hypertable).
-- Idempotent; derives latest occupancy per zone from parking_spots.

BEGIN;

DELETE FROM occupancy_snapshots
WHERE parking_lot_id IN (SELECT id FROM parking_lots);

INSERT INTO occupancy_snapshots (
    id,
    parking_lot_id,
    zone_type,
    occupied_count,
    total_count,
    recorded_at
)
WITH base AS (
    SELECT
        s.parking_lot_id,
        s.zone,
        MD5(
            CONCAT(s.parking_lot_id::text, ':', s.zone::text, ':seed')
        ) AS h,
        s.status
    FROM parking_spots AS s
)
SELECT
    (
        SUBSTRING(h, 1, 8)
        || '-'
        || SUBSTRING(h, 9, 4)
        || '-'
        || SUBSTRING(h, 13, 4)
        || '-'
        || SUBSTRING(h, 17, 4)
        || '-'
        || SUBSTRING(h, 21, 12)
    )::uuid,
    parking_lot_id,
    zone,
    COUNT(*) FILTER (
        WHERE status IN ('occupied', 'reserved')
    )::int AS occupied_count,
    COUNT(*)::int AS total_count,
    NOW() AT TIME ZONE 'UTC' AS recorded_at
FROM base
GROUP BY parking_lot_id, zone, h;

COMMIT;
