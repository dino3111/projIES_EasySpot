-- Seed data for sensor_registry (PostgreSQL) and alerts (TimescaleDB).
-- Run AFTER parking_seed_postgres.sql (parking_lots rows must exist).
-- Idempotent via ON CONFLICT / DELETE+INSERT.
--
-- Parques cobertos:
--   b231a846-... Estádio Cidade de Coimbra  (5 sensores)
--   452ed8eb-... CoimbraShopping            (4 sensores)
--   4731819f-... Fórum Aveiro               (7 sensores)
--   d8085d8f-... Glicínias Plaza            (4 sensores)
--   070b4f4d-... Europa – Leiria            (4 sensores)
--   62feaf63-... Foz Plaza                  (3 sensores)

-- ─── sensor_registry (Postgres) ─────────────────────────────────────────────

begin;

insert into sensor_registry (
    sensor_id, parking_lot_id, zone, status, last_seen_at, created_at
)
values
-- ── Estádio Cidade de Coimbra ────────────────────────────────────────────
(
    'IR-CO1-MR02',
    'b231a846-7d40-5100-ba29-b9c0ca0ef9aa',
    'Piso -1 – Mobilidade Reduzida',
    'OFFLINE',
    now() - interval '2 hours',
    '2024-04-10 00:00:00'
),
(
    'IR-CO1-MR01',
    'b231a846-7d40-5100-ba29-b9c0ca0ef9aa',
    'Piso -1 – Mobilidade Reduzida',
    'OPERATIONAL',
    now() - interval '5 minutes',
    '2024-04-10 00:00:00'
),
(
    'IR-CO1-A01',
    'b231a846-7d40-5100-ba29-b9c0ca0ef9aa',
    'Piso 0 – Zona A',
    'OPERATIONAL',
    now() - interval '4 minutes',
    '2024-04-12 00:00:00'
),
(
    'ENT-CO1-ENT1',
    'b231a846-7d40-5100-ba29-b9c0ca0ef9aa',
    'Entrada Principal',
    'OPERATIONAL',
    now() - interval '3 minutes',
    '2024-04-01 00:00:00'
),
(
    'GW-CO1-01',
    'b231a846-7d40-5100-ba29-b9c0ca0ef9aa',
    'Sala Técnica',
    'OPERATIONAL',
    now() - interval '2 minutes',
    '2024-03-28 00:00:00'
),

-- ── CoimbraShopping ──────────────────────────────────────────────────────
(
    'OCR-CO2-SAI1',
    '452ed8eb-d0a3-5d61-8428-572e946614a5',
    'Saída Principal',
    'OFFLINE',
    now() - interval '14 hours',
    '2024-05-01 00:00:00'
),
(
    'IR-CO2-B01',
    '452ed8eb-d0a3-5d61-8428-572e946614a5',
    'Piso 0 – Zona B',
    'OPERATIONAL',
    now() - interval '6 minutes',
    '2024-05-01 00:00:00'
),
(
    'ENT-CO2-ENT1',
    '452ed8eb-d0a3-5d61-8428-572e946614a5',
    'Entrada Principal',
    'OPERATIONAL',
    now() - interval '4 minutes',
    '2024-04-20 00:00:00'
),
(
    'GW-CO2-01',
    '452ed8eb-d0a3-5d61-8428-572e946614a5',
    'Sala Técnica',
    'OPERATIONAL',
    now() - interval '3 minutes',
    '2024-04-18 00:00:00'
),

-- ── Fórum Aveiro ─────────────────────────────────────────────────────────
(
    'IR-AV1-B07',
    '4731819f-a806-5c1f-be8c-a478d4276840',
    'Piso 0 – Zona B',
    'OFFLINE',
    now() - interval '2 hours',
    '2024-06-15 00:00:00'
),
(
    'IR-AV1-B08',
    '4731819f-a806-5c1f-be8c-a478d4276840',
    'Piso 0 – Zona B',
    'OPERATIONAL',
    now() - interval '7 minutes',
    '2024-06-15 00:00:00'
),
(
    'IR-AV1-A01',
    '4731819f-a806-5c1f-be8c-a478d4276840',
    'Piso 0 – Zona A',
    'OPERATIONAL',
    now() - interval '6 minutes',
    '2024-06-10 00:00:00'
),
(
    'IR-AV1-EV01',
    '4731819f-a806-5c1f-be8c-a478d4276840',
    'Piso 0 – Carregamento EV',
    'OPERATIONAL',
    now() - interval '8 minutes',
    '2024-07-01 00:00:00'
),
(
    'ENT-AV1-ENT1',
    '4731819f-a806-5c1f-be8c-a478d4276840',
    'Entrada Principal',
    'OPERATIONAL',
    now() - interval '4 minutes',
    '2024-06-01 00:00:00'
),
(
    'OCR-AV1-SAI1',
    '4731819f-a806-5c1f-be8c-a478d4276840',
    'Saída Principal',
    'OPERATIONAL',
    now() - interval '5 minutes',
    '2024-06-01 00:00:00'
),
(
    'GW-AV1-01',
    '4731819f-a806-5c1f-be8c-a478d4276840',
    'Sala Técnica',
    'OPERATIONAL',
    now() - interval '2 minutes',
    '2024-05-28 00:00:00'
),

-- ── Glicínias Plaza ──────────────────────────────────────────────────────
(
    'IR-AV2-P1-01',
    'd8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43',
    'Piso -1',
    'OPERATIONAL',
    now() - interval '5 minutes',
    '2024-07-10 00:00:00'
),
(
    'IR-AV2-P1-02',
    'd8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43',
    'Piso -1',
    'DEGRADED',
    now() - interval '30 minutes',
    '2024-07-10 00:00:00'
),
(
    'ENT-AV2-ENT1',
    'd8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43',
    'Entrada Principal',
    'OPERATIONAL',
    now() - interval '3 minutes',
    '2024-07-05 00:00:00'
),
(
    'GW-AV2-01',
    'd8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43',
    'Sala Técnica',
    'OPERATIONAL',
    now() - interval '2 minutes',
    '2024-07-01 00:00:00'
),

-- ── Europa – Leiria ──────────────────────────────────────────────────────
(
    'IR-LE1-A01',
    '070b4f4d-9a9e-5c4a-92bd-eae711ecb6b3',
    'Piso 0 – Zona A',
    'OPERATIONAL',
    now() - interval '4 minutes',
    '2024-08-01 00:00:00'
),
(
    'IR-LE1-A02',
    '070b4f4d-9a9e-5c4a-92bd-eae711ecb6b3',
    'Piso 0 – Zona A',
    'OFFLINE',
    now() - interval '5 hours',
    '2024-08-01 00:00:00'
),
(
    'ENT-LE1-ENT1',
    '070b4f4d-9a9e-5c4a-92bd-eae711ecb6b3',
    'Entrada Principal',
    'OPERATIONAL',
    now() - interval '3 minutes',
    '2024-07-28 00:00:00'
),
(
    'GW-LE1-01',
    '070b4f4d-9a9e-5c4a-92bd-eae711ecb6b3',
    'Sala Técnica',
    'OPERATIONAL',
    now() - interval '2 minutes',
    '2024-07-25 00:00:00'
),

-- ── Foz Plaza – Figueira da Foz ──────────────────────────────────────────
(
    'IR-FI2-A01',
    '62feaf63-aa20-5070-b89f-e81bfd5f47cd',
    'Piso 0 – Zona A',
    'OPERATIONAL',
    now() - interval '6 minutes',
    '2024-09-01 00:00:00'
),
(
    'ENT-FI2-ENT1',
    '62feaf63-aa20-5070-b89f-e81bfd5f47cd',
    'Entrada Principal',
    'OPERATIONAL',
    now() - interval '4 minutes',
    '2024-09-01 00:00:00'
),
(
    'GW-FI2-01',
    '62feaf63-aa20-5070-b89f-e81bfd5f47cd',
    'Sala Técnica',
    'DEGRADED',
    now() - interval '45 minutes',
    '2024-08-28 00:00:00'
)
on conflict (sensor_id) do update set
    status = excluded.status,
    last_seen_at = excluded.last_seen_at;

commit;
