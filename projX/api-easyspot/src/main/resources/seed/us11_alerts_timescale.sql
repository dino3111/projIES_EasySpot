-- User Story #11 issue log test data (TimescaleDB)
-- Usage:
--   From projX/ folder:
--     docker compose exec -T timescaledb \
--       sh -lc "psql -U easyspot -d easyspot_ts" \
--       < api-easyspot/src/main/resources/seed/us11_alerts_timescale.sql
--
-- If alerts table does not exist yet (API not initialized), this creates it.

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
    description text not null,
    photo_url text,
    reported_by text,
    attributed_to text,
    notes text,
    resolved_at timestamptz,
    created_at timestamptz not null,
    primary key (id, created_at)
);

begin;

insert into public.alerts (
    id, parking_lot_id, parking_lot_name,
    type, severity, state,
    zone, spot_number, sensor_id, plate, description,
    photo_url, reported_by, attributed_to, notes, resolved_at, created_at
)
values
(
    '5e1e1d9c-c0db-4078-8c4a-42c9fedfb31a',
    '4731819f-a806-5c1f-be8c-a478d4276840',
    'Fórum Aveiro',
    'SENSOR', 'CRITICAL', 'RESOLVED',
    'Piso 0 – Zona B', 'B07', 'IR-AV1-B07', null,
    'Sensor infravermelho sem leituras há mais de 2 horas.',
    null, 'Test Technical', 'Test Technical',
    'Sensor substituído e operacional.',
    '2026-05-08T14:00:00Z',
    '2026-05-08T08:14:00Z'
),
(
    'bbceda93-e42f-4a08-a0a1-c6f18f67145e',
    'd8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43',
    'Glicínias Plaza',
    'CLIENT', 'WARNING', 'IN_PROGRESS',
    'Piso -1', null, null, '55-AB-23',
    'Condutor reporta cobrança incorreta para estadia curta.',
    null, 'Suporte EasySpot', 'Suporte EasySpot',
    'A verificar logs OCR de entrada e saída.',
    null,
    '2026-05-08T16:30:00Z'
),
(
    '27c4f782-89af-4ca6-9e1c-e37ef0ef7cc6',
    '070b4f4d-9a9e-5c4a-92bd-eae711ecb6b3',
    'Europa',
    'SYSTEM', 'CRITICAL', 'RESOLVED',
    'Entrada Principal', null, null, null,
    'Leitor OCR da entrada principal sem comunicação.',
    null, 'Test Technical', 'Test Technical',
    'Cabo de rede recolocado. Leitor OCR operacional.',
    '2026-05-08T10:30:00Z',
    '2026-05-08T06:50:00Z'
),
(
    'fd6678cb-7c42-42e7-aeb6-10ad95f41512',
    '452ed8eb-d0a3-5d61-8428-572e946614a5',
    'CoimbraShopping',
    'SENSOR', 'WARNING', 'IN_PROGRESS',
    'Piso -2', 'C14', 'IR-CO2-C14', null,
    'Sensor C14 com leituras intermitentes e falsos positivos.',
    null, 'Nuno Almeida', 'Nuno Almeida',
    'Monitorização ativa iniciada.',
    null,
    '2026-05-09T07:30:00Z'
),
(
    '818bda85-2fcc-40e8-b94a-c6dd7ca81634',
    'b231a846-7d40-5100-ba29-b9c0ca0ef9aa',
    'Estádio Cidade de Coimbra',
    'CLIENT', 'INFO', 'RESOLVED',
    'Piso 0', null, null, '41-EF-77',
    'Cliente reportou inconsistência de lugares livres na app.',
    null, 'Suporte EasySpot', 'Suporte EasySpot',
    'Sincronização restabelecida; utilizador notificado.',
    '2026-05-09T10:05:00Z',
    '2026-05-09T09:10:00Z'
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
    reported_by = excluded.reported_by,
    attributed_to = excluded.attributed_to,
    notes = excluded.notes,
    resolved_at = excluded.resolved_at;

commit;
