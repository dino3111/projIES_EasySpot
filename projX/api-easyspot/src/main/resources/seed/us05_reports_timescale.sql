-- User Story #5: Report Unauthorized Parking — test data (TimescaleDB)
-- Inserts CLIENT-type alerts submitted by drivers from the profile page.
--
-- Usage (from projX/ folder):
--   docker compose exec -T timescaledb \
--     sh -lc "psql -U easyspot -d easyspot_ts" \
--     < api-easyspot/src/main/resources/seed/us05_reports_timescale.sql
--
-- Requires parking_seed_postgres.sql to have been applied first (parking_lots).
-- Park IDs must match parking_seed_postgres.sql values.
--
-- Violation types accepted by ReportService:
--   accessible | reserved | ev | double-parked | blocking | other
-- Severity rules:
--   blocking → CRITICAL   all others → WARNING
-- States used here:
--   OPEN (pending review) | IN_PROGRESS (being handled) | RESOLVED (closed)

begin;

create table if not exists public.alerts (
    id uuid not null,
    parking_lot_id uuid not null,
    parking_lot_name text,
    type text not null,
    severity text not null,
    state text not null,
    zone text,
    spot_number text,
    sensor_id text,
    plate text,
    description text,
    photo_url text,
    attributed_to text,
    notes text,
    resolved_at timestamptz,
    created_at timestamptz not null,
    primary key (id, created_at)
);

insert into public.alerts (
    id,
    parking_lot_id,
    parking_lot_name,
    type,
    severity,
    state,
    zone,
    spot_number,
    sensor_id,
    plate,
    description,
    photo_url,
    attributed_to,
    notes,
    resolved_at,
    created_at
)
values

-- 1. Accessible spot taken — OPEN (pending)
(
    'a1000000-0000-0000-0000-000000000001',
    '4731819f-a806-5c1f-be8c-a478d4276840', -- Fórum Aveiro
    'Fórum Aveiro',
    'CLIENT', 'WARNING', 'OPEN',
    'Piso 0', 'MR-03', null, '22-AB-44',
    'Veículo sem dístico de mobilidade reduzida estacionado no lugar MR-03'
    ' desde as 10h30.',
    null, 'Filipe Teixeira',
    null, null,
    '2026-05-09T10:35:00Z'
),

-- 2. EV spot occupied by non-EV vehicle — IN_PROGRESS
(
    'a1000000-0000-0000-0000-000000000002',
    'd8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43', -- Glicínias Plaza
    'Glicínias Plaza',
    'CLIENT', 'WARNING', 'IN_PROGRESS',
    'Piso -1', 'EV-07', null, '55-CD-11',
    'Veículo a gasóleo estacionado no lugar de carregamento EV-07'
    ' há mais de 2 horas.',
    null, 'Maria Silva',
    'Assistente do parque verificou no local — contacto com proprietário.',
    null,
    '2026-05-08T14:20:00Z'
),

-- 3. Blocking exit — CRITICAL severity — OPEN
(
    'a1000000-0000-0000-0000-000000000003',
    '452ed8eb-d0a3-5d61-8428-572e946614a5', -- CoimbraShopping
    'CoimbraShopping',
    'CLIENT', 'CRITICAL', 'OPEN',
    'Piso -2', 'E-01', null, null,
    'Veículo a bloquear completamente a saída de emergência do Piso -2.',
    null, 'Luís Pedro',
    null, null,
    '2026-05-10T08:05:00Z'
),

-- 4. Reserved spot taken — RESOLVED
(
    'a1000000-0000-0000-0000-000000000004',
    'b231a846-7d40-5100-ba29-b9c0ca0ef9aa', -- Estádio Cidade de Coimbra
    'Estádio Cidade de Coimbra',
    'CLIENT', 'WARNING', 'RESOLVED',
    'Zona B', 'B-12', null, '33-EF-55',
    'Veículo particular no lugar reservado para autocarro de equipa visitante.',
    null, 'Filipe Teixeira',
    'Proprietário notificado e veículo removeu-se voluntariamente.',
    '2026-05-07T19:45:00Z',
    '2026-05-07T17:30:00Z'
),

-- 5. Double parking — WARNING — IN_PROGRESS
(
    'a1000000-0000-0000-0000-000000000005',
    '070b4f4d-9a9e-5c4a-92bd-eae711ecb6b3', -- Europa (Leiria)
    'Europa',
    'CLIENT', 'WARNING', 'IN_PROGRESS',
    'Piso 1', 'A-04', null, '77-GH-99',
    'Veículo em dupla fila junto ao lugar A-04 a bloquear saída de dois veículos.',
    null, 'Maria Silva',
    'Segurança do parque a tentar localizar o condutor.',
    null,
    '2026-05-10T13:05:00Z'
),

-- 6. Accessible spot taken — no plate provided — OPEN
(
    'a1000000-0000-0000-0000-000000000006',
    '7021e6fc-7585-5463-bbb7-de9bb8f4c37b', -- Estádio Municipal Leiria
    'Estádio Municipal Dr. Magalhães Pessoa',
    'CLIENT', 'WARNING', 'OPEN',
    'Piso 0', 'MR-01', null, null,
    'Lugar reservado para mobilidade reduzida ocupado por veículo sem dístico.',
    null, 'Luís Pedro',
    null, null,
    '2026-05-10T09:15:00Z'
),

-- 7. Other violation — RESOLVED — with photo URL (simulated CDN URL)
(
    'a1000000-0000-0000-0000-000000000007',
    '4731819f-a806-5c1f-be8c-a478d4276840', -- Fórum Aveiro
    'Fórum Aveiro',
    'CLIENT', 'WARNING', 'RESOLVED',
    'Piso -1', 'C-22', null, '10-IJ-32',
    'Veículo estacionado fora dos limites, ocupando parte do corredor.',
    'https://cdn.easyspot.example/reports/mock-photo-c22.jpg',
    'Ana Costa',
    'Veículo reposicionado pelo próprio condutor após aviso.',
    '2026-05-06T11:30:00Z',
    '2026-05-06T10:45:00Z'
)

on conflict (id, created_at) do update set
    parking_lot_id = excluded.parking_lot_id,
    parking_lot_name = excluded.parking_lot_name,
    type = excluded.type,
    severity = excluded.severity,
    state = excluded.state,
    zone = excluded.zone,
    spot_number = excluded.spot_number,
    sensor_id = excluded.sensor_id,
    plate = excluded.plate,
    description = excluded.description,
    photo_url = excluded.photo_url,
    attributed_to = excluded.attributed_to,
    notes = excluded.notes,
    resolved_at = excluded.resolved_at;

commit;
