-- User Story #11 manual test data (PostgreSQL app DB)
-- Covers:
-- 1) Tariffs
-- 2) Effective date history via tariff_audit.changed_at
--
-- Usage:
--   From projX/ folder:
--     docker compose exec -T postgres sh -lc "psql -U authentik -d easyspot" < api-easyspot/src/main/resources/seed/us11_test_data.sql
--
-- For issue log test data (alerts with timestamps), run:
--   src/main/resources/seed/us11_alerts_timescale.sql
--
-- Note: this script expects parking_lots to be populated (e.g., parking_seed_postgres.sql).

BEGIN;

-- Park names from parking_seed_postgres.sql
WITH park_refs(park_key, park_name) AS (
    VALUES
    ('coimbra-stadium', 'Estádio Cidade de Coimbra'),
    ('coimbra-shopping', 'CoimbraShopping'),
    ('forum-aveiro', 'Fórum Aveiro'),
    ('glicinias-plaza', 'Glicínias Plaza')
),
resolved_parks AS (
    SELECT pr.park_key, p.id AS parking_lot_id
    FROM park_refs pr
    JOIN public.parking_lots p ON p.name = pr.park_name
),
tariff_seed(id, park_key, name, description, price_per_hour, max_daily, monthly, price_per_kwh, status) AS (
    VALUES
    ('1d6f9f43-65f1-4898-9d1d-c8fd040c5f01'::uuid, 'coimbra-stadium', 'US11 Manager Baseline', 'Tarifa base para validação manual no dashboard', 1.80::numeric, 14.00::numeric, 140.00::numeric, 0.32::numeric, 'ACTIVE'),
    ('42ea890c-aa26-4cb8-b6f8-ef44719ff8f4'::uuid, 'coimbra-shopping', 'US11 Midweek Revision', 'Tarifa em revisão para testes de estado', 1.55::numeric, 12.50::numeric, 112.00::numeric, 0.31::numeric, 'INACTIVE'),
    ('9ff5f18f-60c8-467a-a644-d52257f71571'::uuid, 'forum-aveiro', 'US11 Prime Hours', 'Tarifa ativa para parque urbano de alta ocupação', 1.95::numeric, 15.00::numeric, 150.00::numeric, 0.40::numeric, 'ACTIVE'),
    ('9e1f2ccf-b00b-45ec-9f53-35e45167365c'::uuid, 'glicinias-plaza', 'US11 Weekend Special', 'Tarifa suspensa para validar filtro por estado', 1.10::numeric, 8.00::numeric, 82.00::numeric, 0.29::numeric, 'INACTIVE')
)
INSERT INTO public.tariffs (id, parking_lot_id, name, description, price_per_hour, max_daily, monthly, price_per_kwh, status)
SELECT s.id, rp.parking_lot_id, s.name, s.description, s.price_per_hour, s.max_daily, s.monthly, s.price_per_kwh, s.status::text
FROM tariff_seed s
JOIN resolved_parks rp ON rp.park_key = s.park_key
ON CONFLICT (id) DO UPDATE SET
    parking_lot_id = EXCLUDED.parking_lot_id,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_per_hour = EXCLUDED.price_per_hour,
    max_daily = EXCLUDED.max_daily,
    monthly = EXCLUDED.monthly,
    price_per_kwh = EXCLUDED.price_per_kwh,
    status = EXCLUDED.status;

-- Tariff effective dates / change history
WITH park_refs(park_key, park_name) AS (
    VALUES
    ('coimbra-stadium', 'Estádio Cidade de Coimbra'),
    ('coimbra-shopping', 'CoimbraShopping'),
    ('forum-aveiro', 'Fórum Aveiro'),
    ('glicinias-plaza', 'Glicínias Plaza')
),
resolved_parks AS (
    SELECT pr.park_key, p.id AS parking_lot_id
    FROM park_refs pr
    JOIN public.parking_lots p ON p.name = pr.park_name
),
audit_seed(id, tariff_id, park_key, price_per_hour, max_daily, monthly, price_per_kwh, status, changed_at, changed_by) AS (
    VALUES
    ('0fd31ec4-3622-43fb-9df6-a638991fce27'::uuid, '1d6f9f43-65f1-4898-9d1d-c8fd040c5f01'::uuid, 'coimbra-stadium', 1.80::numeric, 14.00::numeric, 140.00::numeric, 0.32::numeric, 'ACTIVE',    '2026-05-01T08:00:00Z'::timestamptz, 'manager-us11'),
    ('96f1ef07-7755-4f43-93fb-0d82f3c4fed7'::uuid, '42ea890c-aa26-4cb8-b6f8-ef44719ff8f4'::uuid, 'coimbra-shopping', 1.55::numeric, 12.50::numeric, 112.00::numeric, 0.31::numeric, 'INACTIVE',    '2026-05-03T10:30:00Z'::timestamptz, 'manager-us11'),
    ('e6ec43af-0d7a-4e37-8adb-5fa92feac9e9'::uuid, '9ff5f18f-60c8-467a-a644-d52257f71571'::uuid, 'forum-aveiro', 1.95::numeric, 15.00::numeric, 150.00::numeric, 0.40::numeric, 'ACTIVE',    '2026-05-06T07:45:00Z'::timestamptz, 'manager-us11'),
    ('eb81a394-ea14-4eb0-a89c-9ec87090f415'::uuid, '9e1f2ccf-b00b-45ec-9f53-35e45167365c'::uuid, 'glicinias-plaza', 1.10::numeric,  8.00::numeric,  82.00::numeric, 0.29::numeric, 'INACTIVE', '2026-05-07T21:15:00Z'::timestamptz, 'manager-us11')
)
INSERT INTO public.tariff_audit (
    id, tariff_id, parking_lot_id, price_per_hour, max_daily, monthly, price_per_kwh, status, changed_at, changed_by
)
SELECT a.id, a.tariff_id, rp.parking_lot_id, a.price_per_hour, a.max_daily, a.monthly, a.price_per_kwh, a.status::text, a.changed_at, a.changed_by
FROM audit_seed a
JOIN resolved_parks rp ON rp.park_key = a.park_key
JOIN public.tariffs t ON t.id = a.tariff_id
ON CONFLICT (id) DO UPDATE SET
    tariff_id = EXCLUDED.tariff_id,
    parking_lot_id = EXCLUDED.parking_lot_id,
    price_per_hour = EXCLUDED.price_per_hour,
    max_daily = EXCLUDED.max_daily,
    monthly = EXCLUDED.monthly,
    price_per_kwh = EXCLUDED.price_per_kwh,
    status = EXCLUDED.status,
    changed_at = EXCLUDED.changed_at,
    changed_by = EXCLUDED.changed_by;

COMMIT;
