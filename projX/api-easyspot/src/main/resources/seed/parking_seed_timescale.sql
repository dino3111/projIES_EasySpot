-- Time-series seed for occupancy snapshots (TimescaleDB hypertable).
-- Occupancy snapshots are intentionally empty — real data comes from sensors.

BEGIN;

DELETE FROM occupancy_snapshots;

COMMIT;
