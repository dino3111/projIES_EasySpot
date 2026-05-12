-- ─── TimescaleDB: alerts ──────────────────────────────────────────────────────

begin;

delete from alerts
where sensor_id = 'IR-AV1-B09';

insert into alerts (
    id, parking_lot_id, parking_lot_name, type, severity, state,
    zone, spot_number, sensor_id, plate, description,
    photo_url, attributed_to, notes, created_at, resolved_at
)
values
-- Active alert: sensor in maintenance
(
    gen_random_uuid(),
    '4731819f-a806-5c1f-be8c-a478d4276840',
    'Fórum Aveiro',
    'SENSOR', 'WARNING', 'OPEN',
    'Piso 0 – Zona B', 'B9', 'IR-AV1-B09',
    null,
    'Sensor IR-AV1-B09 em manutenção programada. Substituição de emissor IR.',
    null, 'Laura Farias', 'Peça encomendada. ETA: 24h.',
    now() - interval '1 hour', null
),
-- Historical alert: previous failure that triggered the repair
(
    gen_random_uuid(),
    '4731819f-a806-5c1f-be8c-a478d4276840',
    'Fórum Aveiro',
    'SENSOR', 'CRITICAL', 'RESOLVED',
    'Piso 0 – Zona B', 'B9', 'IR-AV1-B09',
    null,
    'Sensor IR-AV1-B09 sem leituras há >3h. Emissor IR queimado.',
    null, 'Laura Farias', 'Colocado em manutenção. Substituição agendada.',
    now() - interval '2 days',
    now() - interval '1 hour'
);

commit;
