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

-- ─── alerts (TimescaleDB) ────────────────────────────────────────────────────
-- Run this block against the TimescaleDB data source.

begin;

delete from alerts
where sensor_id in (
    'IR-CO1-MR02', 'IR-CO1-MR01', 'IR-CO1-A01',
    'ENT-CO1-ENT1', 'GW-CO1-01',
    'OCR-CO2-SAI1', 'IR-CO2-B01', 'ENT-CO2-ENT1', 'GW-CO2-01',
    'IR-AV1-B07', 'IR-AV1-B08', 'IR-AV1-A01', 'IR-AV1-EV01',
    'ENT-AV1-ENT1', 'OCR-AV1-SAI1', 'GW-AV1-01',
    'IR-AV2-P1-01', 'IR-AV2-P1-02', 'ENT-AV2-ENT1', 'GW-AV2-01',
    'IR-LE1-A01', 'IR-LE1-A02', 'ENT-LE1-ENT1', 'GW-LE1-01',
    'IR-FI2-A01', 'ENT-FI2-ENT1', 'GW-FI2-01'
);

insert into alerts (
    id, parking_lot_id, parking_lot_name, type, severity, state,
    zone, spot_number, sensor_id, plate, description,
    photo_url, attributed_to, notes, created_at, resolved_at
)
values

-- ══ Estádio Cidade de Coimbra ════════════════════════════════════════════

-- IR-CO1-MR02: falha total ativa
(
    gen_random_uuid(),
    'b231a846-7d40-5100-ba29-b9c0ca0ef9aa',
    'Estádio Cidade de Coimbra',
    'SENSOR', 'CRITICAL', 'OPEN',
    'Piso -1 – Mobilidade Reduzida', 'MR-02', 'IR-CO1-MR02',
    null,
    'Falha total do sensor MR-02. Lugar sem monitorização ativa.',
    null, null, null,
    now() - interval '2 hours', null
),

-- IR-CO1-MR02: falso-negativo resolvido
(
    gen_random_uuid(),
    'b231a846-7d40-5100-ba29-b9c0ca0ef9aa',
    'Estádio Cidade de Coimbra',
    'SENSOR', 'WARNING', 'RESOLVED',
    'Piso -1 – Mobilidade Reduzida', 'MR-02', 'IR-CO1-MR02',
    null,
    'Lugar detetado como livre após 3h de ocupação'
    ' (falso-negativo). Recalibrado.',
    null, 'Laura Farias', 'Recalibração automática bem-sucedida.',
    now() - interval '2 days',
    now() - interval '1 day 20 hours'
),

-- IR-CO1-MR02: sinal fraco resolvido
(
    gen_random_uuid(),
    'b231a846-7d40-5100-ba29-b9c0ca0ef9aa',
    'Estádio Cidade de Coimbra',
    'SENSOR', 'WARNING', 'RESOLVED',
    'Piso -1 – Mobilidade Reduzida', 'MR-02', 'IR-CO1-MR02',
    null,
    'Potência IR reduzida a 25% da nominal.',
    null, 'Laura Farias', null,
    now() - interval '4 days',
    now() - interval '3 days 22 hours'
),

-- ENT-CO1-ENT1: reinício watchdog
(
    gen_random_uuid(),
    'b231a846-7d40-5100-ba29-b9c0ca0ef9aa',
    'Estádio Cidade de Coimbra',
    'SYSTEM', 'WARNING', 'RESOLVED',
    'Entrada Principal', null, 'ENT-CO1-ENT1',
    null,
    'Reinício automático por watchdog. Serviço restaurado após 45s.',
    null, null, null,
    now() - interval '7 days',
    now() - interval '7 days' + interval '1 minute'
),

-- GW-CO1-01: atualização firmware
(
    gen_random_uuid(),
    'b231a846-7d40-5100-ba29-b9c0ca0ef9aa',
    'Estádio Cidade de Coimbra',
    'SYSTEM', 'INFO', 'RESOLVED',
    'Sala Técnica', null, 'GW-CO1-01',
    null,
    'Atualização de firmware GW v5.0.1→v5.0.2 concluída com sucesso.',
    null, 'Laura Farias', null,
    now() - interval '10 days',
    now() - interval '10 days' + interval '30 minutes'
),

-- ══ CoimbraShopping ══════════════════════════════════════════════════════

-- OCR-CO2-SAI1: câmara sem sinal ativa
(
    gen_random_uuid(),
    '452ed8eb-d0a3-5d61-8428-572e946614a5',
    'CoimbraShopping',
    'SENSOR', 'CRITICAL', 'OPEN',
    'Saída Principal', null, 'OCR-CO2-SAI1',
    null,
    'Câmara OCR de saída sem sinal de vídeo desde as 19h30.'
    ' Alimentação ou cabo de vídeo a verificar.',
    null, null, null,
    now() - interval '14 hours', null
),

-- OCR-CO2-SAI1: leitura de matrícula falhou
(
    gen_random_uuid(),
    '452ed8eb-d0a3-5d61-8428-572e946614a5',
    'CoimbraShopping',
    'SENSOR', 'WARNING', 'RESOLVED',
    'Saída Principal', null, 'OCR-CO2-SAI1',
    null,
    'Taxa de leitura de matrículas caiu para 60%'
    ' (normal >95%). Lente com sujidade.',
    null, 'Laura Farias', 'Lente limpa. Taxa regressou a 97%.',
    now() - interval '5 days',
    now() - interval '5 days' + interval '3 hours'
),

-- GW-CO2-01: sobrecarga de rede
(
    gen_random_uuid(),
    '452ed8eb-d0a3-5d61-8428-572e946614a5',
    'CoimbraShopping',
    'SYSTEM', 'WARNING', 'RESOLVED',
    'Sala Técnica', null, 'GW-CO2-01',
    null,
    'Latência de rede >500ms detetada. Gateway reiniciado.',
    null, 'Laura Farias', null,
    now() - interval '12 days',
    now() - interval '12 days' + interval '15 minutes'
),

-- ══ Fórum Aveiro ═════════════════════════════════════════════════════════

-- IR-AV1-B07: sem leituras ativo
(
    gen_random_uuid(),
    '4731819f-a806-5c1f-be8c-a478d4276840',
    'Fórum Aveiro',
    'SENSOR', 'CRITICAL', 'OPEN',
    'Piso 0 – Zona B', 'B7', 'IR-AV1-B07',
    null,
    'Sensor IR sem leituras há >2h.'
    ' LED do lugar B7 permanece verde com lugar ocupado.',
    null, null, null,
    now() - interval '2 hours', null
),

-- IR-AV1-B07: sinal fraco resolvido
(
    gen_random_uuid(),
    '4731819f-a806-5c1f-be8c-a478d4276840',
    'Fórum Aveiro',
    'SENSOR', 'WARNING', 'RESOLVED',
    'Piso 0 – Zona B', 'B7', 'IR-AV1-B07',
    null,
    'Sinal IR abaixo do limiar mínimo (18% vs 40% esperado).',
    null, 'Laura Farias', 'Emissor IR substituído.',
    now() - interval '2 days',
    now() - interval '1 day 18 hours'
),

-- IR-AV1-B07: desvio de calibração resolvido
(
    gen_random_uuid(),
    '4731819f-a806-5c1f-be8c-a478d4276840',
    'Fórum Aveiro',
    'SENSOR', 'WARNING', 'RESOLVED',
    'Piso 0 – Zona B', 'B7', 'IR-AV1-B07',
    null,
    'Desvio de calibração detetado.'
    ' Recalibração automática bem-sucedida.',
    null, null, null,
    now() - interval '5 days',
    now() - interval '5 days' + interval '10 minutes'
),

-- IR-AV1-B07: timeout de comunicação resolvido
(
    gen_random_uuid(),
    '4731819f-a806-5c1f-be8c-a478d4276840',
    'Fórum Aveiro',
    'SENSOR', 'WARNING', 'RESOLVED',
    'Piso 0 – Zona B', 'B7', 'IR-AV1-B07',
    null,
    'Timeout de comunicação com gateway GW-AV1-01 (3 tentativas).',
    null, null, null,
    now() - interval '8 days',
    now() - interval '8 days' + interval '5 minutes'
),

-- GW-AV1-01: atualização firmware
(
    gen_random_uuid(),
    '4731819f-a806-5c1f-be8c-a478d4276840',
    'Fórum Aveiro',
    'SYSTEM', 'INFO', 'RESOLVED',
    'Sala Técnica', null, 'GW-AV1-01',
    null,
    'Atualização de firmware GW v5.0.1→v5.0.2 concluída com sucesso.',
    null, 'Laura Farias', null,
    now() - interval '14 days',
    now() - interval '14 days' + interval '20 minutes'
),

-- ══ Glicínias Plaza ══════════════════════════════════════════════════════

-- IR-AV2-P1-02: sinal degradado ativo
(
    gen_random_uuid(),
    'd8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43',
    'Glicínias Plaza',
    'SENSOR', 'WARNING', 'OPEN',
    'Piso -1', 'P1-02', 'IR-AV2-P1-02',
    null,
    'Sinal IR instável.'
    ' Taxa de falsos-positivos subiu para 18% nas últimas 2h.',
    null, null, null,
    now() - interval '30 minutes', null
),

-- IR-AV2-P1-02: interrupção breve resolvida
(
    gen_random_uuid(),
    'd8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43',
    'Glicínias Plaza',
    'SENSOR', 'WARNING', 'RESOLVED',
    'Piso -1', 'P1-02', 'IR-AV2-P1-02',
    null,
    'Perda de leitura por 12 minutos.'
    ' Sensor recuperou sem intervenção.',
    null, null, null,
    now() - interval '3 days',
    now() - interval '3 days' + interval '12 minutes'
),

-- GW-AV2-01: reinício watchdog
(
    gen_random_uuid(),
    'd8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43',
    'Glicínias Plaza',
    'SYSTEM', 'INFO', 'RESOLVED',
    'Sala Técnica', null, 'GW-AV2-01',
    null,
    'Reinício de rotina por watchdog. Sistema restaurado em 30s.',
    null, null, null,
    now() - interval '6 days',
    now() - interval '6 days' + interval '1 minute'
),

-- ══ Europa – Leiria ══════════════════════════════════════════════════════

-- IR-LE1-A02: offline ativo
(
    gen_random_uuid(),
    '070b4f4d-9a9e-5c4a-92bd-eae711ecb6b3',
    'Europa',
    'SENSOR', 'CRITICAL', 'OPEN',
    'Piso 0 – Zona A', 'A02', 'IR-LE1-A02',
    null,
    'Sensor IR-LE1-A02 sem resposta há >5h.'
    ' Possível falha de alimentação.',
    null, null, null,
    now() - interval '5 hours', null
),

-- IR-LE1-A02: falso-positivo resolvido
(
    gen_random_uuid(),
    '070b4f4d-9a9e-5c4a-92bd-eae711ecb6b3',
    'Europa',
    'SENSOR', 'WARNING', 'RESOLVED',
    'Piso 0 – Zona A', 'A02', 'IR-LE1-A02',
    null,
    'Falso-positivo: lugar A02 reportado como ocupado'
    ' durante 40 min sem veículo.',
    null, 'Laura Farias', 'Recalibração do limiar de deteção.',
    now() - interval '10 days',
    now() - interval '10 days' + interval '1 hour'
),

-- GW-LE1-01: atualização firmware
(
    gen_random_uuid(),
    '070b4f4d-9a9e-5c4a-92bd-eae711ecb6b3',
    'Europa',
    'SYSTEM', 'INFO', 'RESOLVED',
    'Sala Técnica', null, 'GW-LE1-01',
    null,
    'Atualização de firmware GW v4.9.0→v5.0.2 aplicada.',
    null, 'Laura Farias', null,
    now() - interval '20 days',
    now() - interval '20 days' + interval '45 minutes'
),

-- ══ Foz Plaza – Figueira da Foz ══════════════════════════════════════════

-- GW-FI2-01: degraded ativo
(
    gen_random_uuid(),
    '62feaf63-aa20-5070-b89f-e81bfd5f47cd',
    'Foz Plaza',
    'SYSTEM', 'WARNING', 'OPEN',
    'Sala Técnica', null, 'GW-FI2-01',
    null,
    'Gateway em modo de manutenção'
    ' para atualização de firmware v5.0.1→v5.0.2.',
    null, 'Laura Farias', 'Atualização em curso.',
    now() - interval '45 minutes', null
),

-- GW-FI2-01: sobrecarga resolvida
(
    gen_random_uuid(),
    '62feaf63-aa20-5070-b89f-e81bfd5f47cd',
    'Foz Plaza',
    'SYSTEM', 'WARNING', 'RESOLVED',
    'Sala Técnica', null, 'GW-FI2-01',
    null,
    'Gateway com CPU a 95% durante 10 minutos. Reinício automático.',
    null, null, null,
    now() - interval '15 days',
    now() - interval '15 days' + interval '3 minutes'
);

commit;
