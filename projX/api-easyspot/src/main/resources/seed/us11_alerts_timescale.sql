-- User Story #11 issue log test data (TimescaleDB)
-- Usage:
--   From projX/ folder:
--     docker compose exec -T timescaledb sh -lc "psql -U easyspot -d easyspot_ts" < api-easyspot/src/main/resources/seed/us11_alerts_timescale.sql
--
-- If alerts table does not exist yet (API not initialized), this script creates it.

CREATE TABLE IF NOT EXISTS public.alerts (
    id uuid NOT NULL,
    parking_lot_id uuid NOT NULL,
    parking_lot_name text,
    type text NOT NULL,
    severity text NOT NULL,
    state text NOT NULL,
    zone text,
    spot_number text,
    sensor_id text,
    plate text,
    description text NOT NULL,
    photo_url text,
    attributed_to text,
    notes text,
    resolved_at timestamptz,
    created_at timestamptz NOT NULL,
    PRIMARY KEY (id, created_at)
);

BEGIN;

INSERT INTO public.alerts (
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
VALUES
(
    '5e1e1d9c-c0db-4078-8c4a-42c9fedfb31a',
    '4731819f-a806-5c1f-be8c-a478d4276840',
    'Fórum Aveiro',
    'SENSOR',
    'CRITICAL',
    'OPEN',
    'Piso 0 – Zona B',
    'B07',
    'IR-AV1-B07',
    NULL,
    'Sensor infravermelho sem leituras há mais de 2 horas.',
    NULL,
    'Laura Farias',
    'A aguardar substituição de sensor.',
    NULL,
    '2026-05-08T08:14:00Z'
),
(
    'bbceda93-e42f-4a08-a0a1-c6f18f67145e',
    'd8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43',
    'Glicínias Plaza',
    'CLIENT',
    'WARNING',
    'IN_PROGRESS',
    'Piso -1',
    NULL,
    NULL,
    '55-AB-23',
    'Condutor reporta cobrança incorreta para estadia curta.',
    NULL,
    'Suporte EasySpot',
    'A verificar logs OCR de entrada e saída.',
    NULL,
    '2026-05-08T16:30:00Z'
),
(
    '27c4f782-89af-4ca6-9e1c-e37ef0ef7cc6',
    '070b4f4d-9a9e-5c4a-92bd-eae711ecb6b3',
    'Europa',
    'SYSTEM',
    'CRITICAL',
    'OPEN',
    'Entrada Principal',
    NULL,
    NULL,
    NULL,
    'Leitor OCR da entrada principal sem comunicação.',
    NULL,
    'Laura Farias',
    'Técnico destacado para intervenção no local.',
    NULL,
    '2026-05-08T06:50:00Z'
),
(
    'fd6678cb-7c42-42e7-aeb6-10ad95f41512',
    '452ed8eb-d0a3-5d61-8428-572e946614a5',
    'CoimbraShopping',
    'SENSOR',
    'WARNING',
    'IN_PROGRESS',
    'Piso -2',
    'C14',
    'IR-CO2-C14',
    NULL,
    'Sensor C14 com leituras intermitentes e falsos positivos.',
    NULL,
    'Nuno Almeida',
    'Monitorização ativa iniciada.',
    NULL,
    '2026-05-09T07:30:00Z'
),
(
    '818bda85-2fcc-40e8-b94a-c6dd7ca81634',
    'b231a846-7d40-5100-ba29-b9c0ca0ef9aa',
    'Estádio Cidade de Coimbra',
    'CLIENT',
    'INFO',
    'RESOLVED',
    'Piso 0',
    NULL,
    NULL,
    '41-EF-77',
    'Cliente reportou inconsistência de lugares livres na app.',
    NULL,
    'Suporte EasySpot',
    'Sincronização restabelecida; utilizador notificado.',
    '2026-05-09T10:05:00Z',
    '2026-05-09T09:10:00Z'
)
ON CONFLICT (id, created_at) DO UPDATE SET
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

COMMIT;
