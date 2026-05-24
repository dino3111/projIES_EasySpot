-- User Story #11 manual test data (PostgreSQL app DB)
-- Covers:
-- 1) Tariffs
-- 2) Effective date history via tariff_audit.changed_at
--
-- Usage:
--   From projX/ folder:
--     docker compose exec -T postgres \
--       sh -lc "psql -U authentik -d easyspot" \
--       < api-easyspot/src/main/resources/seed/us11_test_data.sql
--
-- For issue log test data (alerts with timestamps), run:
--   src/main/resources/seed/us11_alerts_timescale.sql
--
-- Note: parking_lots must be populated (e.g. parking_seed_postgres.sql).

begin;

-- Park names from parking_seed_postgres.sql
with park_refs (park_key, park_name) as (
    values
    ('coimbra-stadium', 'Estádio Cidade de Coimbra'),
    ('coimbra-shopping', 'CoimbraShopping'),
    ('forum-aveiro', 'Fórum Aveiro'),
    ('glicinias-plaza', 'Glicínias Plaza')
),

resolved_parks as (
    select
        pr.park_key,
        p.id as parking_lot_id
    from park_refs as pr
    inner join public.parking_lots as p on pr.park_name = p.name
),

tariff_seed (
    id, park_key, name, description,
    price_per_hour, max_daily, monthly, price_per_kwh, status
) as (
    values
    (
        '1d6f9f43-65f1-4898-9d1d-c8fd040c5f01'::uuid,
        'coimbra-stadium',
        'US11 Manager Baseline',
        'Tarifa base para validação manual no dashboard',
        1.80::numeric, 14.00::numeric, 140.00::numeric, 0.32::numeric,
        'ACTIVE'
    ),
    (
        '42ea890c-aa26-4cb8-b6f8-ef44719ff8f4'::uuid,
        'coimbra-shopping',
        'US11 Midweek Revision',
        'Tarifa para validação manual no dashboard',
        1.55::numeric, 12.50::numeric, 112.00::numeric, 0.31::numeric,
        'ACTIVE'
    ),
    (
        '9ff5f18f-60c8-467a-a644-d52257f71571'::uuid,
        'forum-aveiro',
        'US11 Prime Hours',
        'Tarifa ativa para parque urbano de alta ocupação',
        1.95::numeric, 15.00::numeric, 150.00::numeric, 0.40::numeric,
        'ACTIVE'
    ),
    (
        '9e1f2ccf-b00b-45ec-9f53-35e45167365c'::uuid,
        'glicinias-plaza',
        'US11 Weekend Special',
        'Tarifa para validação manual no dashboard',
        1.10::numeric, 8.00::numeric, 82.00::numeric, 0.29::numeric,
        'ACTIVE'
    )
)

insert into public.tariffs (
    id, parking_lot_id, name, description,
    price_per_hour, max_daily, monthly, price_per_kwh, status
)
select
    s.id,
    rp.parking_lot_id,
    s.name,
    s.description,
    s.price_per_hour,
    s.max_daily,
    s.monthly,
    s.price_per_kwh,
    s.status::text
from tariff_seed as s
inner join resolved_parks as rp on s.park_key = rp.park_key
on conflict (id) do update set
    parking_lot_id = excluded.parking_lot_id,
    name = excluded.name,
    description = excluded.description,
    price_per_hour = excluded.price_per_hour,
    max_daily = excluded.max_daily,
    monthly = excluded.monthly,
    price_per_kwh = excluded.price_per_kwh,
    status = excluded.status;

-- Tariff effective dates / change history
with park_refs (park_key, park_name) as (
    values
    ('coimbra-stadium', 'Estádio Cidade de Coimbra'),
    ('coimbra-shopping', 'CoimbraShopping'),
    ('forum-aveiro', 'Fórum Aveiro'),
    ('glicinias-plaza', 'Glicínias Plaza')
),

resolved_parks as (
    select
        pr.park_key,
        p.id as parking_lot_id
    from park_refs as pr
    inner join public.parking_lots as p on pr.park_name = p.name
),

audit_seed (
    id, tariff_id, park_key,
    price_per_hour, max_daily, monthly, price_per_kwh,
    status, changed_at, changed_by
) as (
    values
    (
        '0fd31ec4-3622-43fb-9df6-a638991fce27'::uuid,
        '1d6f9f43-65f1-4898-9d1d-c8fd040c5f01'::uuid,
        'coimbra-stadium',
        1.80::numeric, 14.00::numeric, 140.00::numeric, 0.32::numeric,
        'ACTIVE', '2026-05-01T08:00:00Z'::timestamptz, 'manager-us11'
    ),
    (
        '96f1ef07-7755-4f43-93fb-0d82f3c4fed7'::uuid,
        '42ea890c-aa26-4cb8-b6f8-ef44719ff8f4'::uuid,
        'coimbra-shopping',
        1.55::numeric, 12.50::numeric, 112.00::numeric, 0.31::numeric,
        'ACTIVE', '2026-05-03T10:30:00Z'::timestamptz, 'manager-us11'
    ),
    (
        'e6ec43af-0d7a-4e37-8adb-5fa92feac9e9'::uuid,
        '9ff5f18f-60c8-467a-a644-d52257f71571'::uuid,
        'forum-aveiro',
        1.95::numeric, 15.00::numeric, 150.00::numeric, 0.40::numeric,
        'ACTIVE', '2026-05-06T07:45:00Z'::timestamptz, 'manager-us11'
    ),
    (
        'eb81a394-ea14-4eb0-a89c-9ec87090f415'::uuid,
        '9e1f2ccf-b00b-45ec-9f53-35e45167365c'::uuid,
        'glicinias-plaza',
        1.10::numeric, 8.00::numeric, 82.00::numeric, 0.29::numeric,
        'ACTIVE', '2026-05-07T21:15:00Z'::timestamptz, 'manager-us11'
    )
)

insert into public.tariff_audit (
    id, tariff_id, parking_lot_id,
    price_per_hour, max_daily, monthly, price_per_kwh,
    status, changed_at, changed_by
)
select
    a.id,
    a.tariff_id,
    rp.parking_lot_id,
    a.price_per_hour,
    a.max_daily,
    a.monthly,
    a.price_per_kwh,
    a.status::text,
    a.changed_at,
    a.changed_by
from audit_seed as a
inner join resolved_parks as rp on a.park_key = rp.park_key
inner join public.tariffs as t on a.tariff_id = t.id
on conflict (id) do update set
    tariff_id = excluded.tariff_id,
    parking_lot_id = excluded.parking_lot_id,
    price_per_hour = excluded.price_per_hour,
    max_daily = excluded.max_daily,
    monthly = excluded.monthly,
    price_per_kwh = excluded.price_per_kwh,
    status = excluded.status,
    changed_at = excluded.changed_at,
    changed_by = excluded.changed_by;

commit;
