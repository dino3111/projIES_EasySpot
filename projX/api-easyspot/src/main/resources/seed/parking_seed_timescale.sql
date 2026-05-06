-- Time-series seed for occupancy snapshots (TimescaleDB hypertable).
-- This script is idempotent and derives the latest occupancy per zone from parking_spots.

BEGIN;

DELETE FROM occupancy_snapshots
WHERE parking_lot_id IN (SELECT id FROM parking_lots);

INSERT INTO occupancy_snapshots (id, parking_lot_id, zone_type, occupied_count, total_count, recorded_at)
SELECT
    (
      SUBSTRING(md5(CONCAT(s.parking_lot_id::text, ':', s.zone::text, ':seed')), 1, 8) || '-' ||
      SUBSTRING(md5(CONCAT(s.parking_lot_id::text, ':', s.zone::text, ':seed')), 9, 4) || '-' ||
      SUBSTRING(md5(CONCAT(s.parking_lot_id::text, ':', s.zone::text, ':seed')), 13, 4) || '-' ||
      SUBSTRING(md5(CONCAT(s.parking_lot_id::text, ':', s.zone::text, ':seed')), 17, 4) || '-' ||
      SUBSTRING(md5(CONCAT(s.parking_lot_id::text, ':', s.zone::text, ':seed')), 21, 12)
    )::uuid,
    s.parking_lot_id,
    s.zone,
    COUNT(*) FILTER (WHERE s.status IN ('occupied', 'reserved'))::int AS occupied_count,
    COUNT(*)::int AS total_count,
    NOW() AT TIME ZONE 'UTC' AS recorded_at
FROM parking_spots s
GROUP BY s.parking_lot_id, s.zone;

COMMIT;
