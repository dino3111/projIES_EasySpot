-- Migration: add operational status to parking_lots
-- Business rules:
--   ACTIVE    = park is operational, visible to drivers, accepts reservations
--   SUSPENDED = park suspended, hidden from drivers, no new reservations
-- Default ACTIVE so all existing parks remain operational after migration.
ALTER TABLE parking_lots
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';

-- District column for district-level filtering (city belongs to a district)
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS district VARCHAR(100);
UPDATE parking_lots SET district = 'Aveiro'  WHERE city IN ('Aveiro', 'Ovar') AND district IS NULL;
UPDATE parking_lots SET district = 'Coimbra' WHERE city IN ('Coimbra', 'Arganil', 'Figueira da Foz') AND district IS NULL;
UPDATE parking_lots SET district = 'Leiria'  WHERE city = 'Leiria' AND district IS NULL;
UPDATE parking_lots SET district = 'Porto'   WHERE city = 'Porto'  AND district IS NULL;
