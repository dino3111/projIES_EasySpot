-- Gate events seed
-- Depends on: parking_seed_postgres.sql (parks + spots)
-- Covers: GATE_OPENED, GATE_CLOSED, GATE_BLOCKED, GATE_FAULT, GATE_RECOVERED
-- One entry gate + one exit gate per park.
-- Uses parks: Fórum Aveiro (AV1), Glicínias Plaza (AV2), Europa Aveiro (LE1), EasySpot EV Hub (EV1)

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- gate_events hypertable (TimescaleDB) — idempotent
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gate_events (
    id             UUID         NOT NULL,
    park_id        UUID         NOT NULL,
    gate_id        TEXT         NOT NULL,
    direction      VARCHAR(10)  NOT NULL,  -- entry | exit
    event_type     TEXT         NOT NULL,  -- gate.opened | gate.closed | gate.blocked | gate.fault | gate.recovered
    state          VARCHAR(10)  NOT NULL,  -- OPEN | CLOSED | BLOCKED | FAULT
    previous_state VARCHAR(10)  NOT NULL,
    plate          VARCHAR(20),
    reason         TEXT         NOT NULL,
    occurred_at    TIMESTAMPTZ  NOT NULL,
    extra          JSONB        NOT NULL DEFAULT '{}',
    PRIMARY KEY (id, occurred_at)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: realistic sequence of gate events for 4 parks (last 8 hours)
-- Each park: entry gate + exit gate
-- Scenario per park:
--   entry gate: CLOSED → OPEN (valid OCR) → CLOSED (auto-close) → BLOCKED (OCR fail) → CLOSED (reset)
--   exit gate:  CLOSED → OPEN (valid OCR) → CLOSED (auto-close)
-- Plus one fault+recovery cycle on Fórum Aveiro entry gate
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO gate_events (id, park_id, gate_id, direction, event_type, state, previous_state, plate, reason, occurred_at, extra)
VALUES

-- ── Fórum Aveiro (AV1) — 4731819f ──────────────────────────────────────────

-- entry gate: normal open/close
(GEN_RANDOM_UUID(), '4731819f-a806-5c1f-be8c-a478d4276840', 'gate-4731819f-entry', 'entry',
 'gate.opened', 'OPEN', 'CLOSED', 'AA-10-AB', 'valid_ocr_read',
 NOW() - INTERVAL '7 hours 50 minutes', '{"scenario": "normal_entry"}'),

(GEN_RANDOM_UUID(), '4731819f-a806-5c1f-be8c-a478d4276840', 'gate-4731819f-entry', 'entry',
 'gate.closed', 'CLOSED', 'OPEN', NULL, 'auto_close_timeout',
 NOW() - INTERVAL '7 hours 48 minutes', '{"scenario": "normal_entry"}'),

-- entry gate: low-confidence OCR → blocked
(GEN_RANDOM_UUID(), '4731819f-a806-5c1f-be8c-a478d4276840', 'gate-4731819f-entry', 'entry',
 'gate.blocked', 'BLOCKED', 'CLOSED', NULL, 'ocr_failure',
 NOW() - INTERVAL '6 hours 30 minutes', '{"scenario": "ocr_failure", "confidence": 0.45}'),

(GEN_RANDOM_UUID(), '4731819f-a806-5c1f-be8c-a478d4276840', 'gate-4731819f-entry', 'entry',
 'gate.closed', 'CLOSED', 'BLOCKED', NULL, 'block_timeout_reset',
 NOW() - INTERVAL '6 hours 25 minutes', '{"scenario": "ocr_failure"}'),

-- entry gate: hardware fault → recovery
(GEN_RANDOM_UUID(), '4731819f-a806-5c1f-be8c-a478d4276840', 'gate-4731819f-entry', 'entry',
 'gate.fault', 'FAULT', 'CLOSED', NULL, 'hardware_fault',
 NOW() - INTERVAL '4 hours', '{"scenario": "fault_recovery"}'),

(GEN_RANDOM_UUID(), '4731819f-a806-5c1f-be8c-a478d4276840', 'gate-4731819f-entry', 'entry',
 'gate.recovered', 'CLOSED', 'FAULT', NULL, 'fault_recovered',
 NOW() - INTERVAL '3 hours 45 minutes', '{"scenario": "fault_recovery"}'),

-- exit gate: normal open/close
(GEN_RANDOM_UUID(), '4731819f-a806-5c1f-be8c-a478d4276840', 'gate-4731819f-exit', 'exit',
 'gate.opened', 'OPEN', 'CLOSED', 'BA-21-CD', 'valid_ocr_read',
 NOW() - INTERVAL '7 hours', '{"scenario": "normal_exit"}'),

(GEN_RANDOM_UUID(), '4731819f-a806-5c1f-be8c-a478d4276840', 'gate-4731819f-exit', 'exit',
 'gate.closed', 'CLOSED', 'OPEN', NULL, 'auto_close_timeout',
 NOW() - INTERVAL '6 hours 58 minutes', '{"scenario": "normal_exit"}'),

-- ── Glicínias Plaza (AV2) — d8085d8f ────────────────────────────────────────

(GEN_RANDOM_UUID(), 'd8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43', 'gate-d8085d8f-entry', 'entry',
 'gate.opened', 'OPEN', 'CLOSED', 'CA-32-EF', 'valid_ocr_read',
 NOW() - INTERVAL '5 hours 30 minutes', '{"scenario": "normal_entry"}'),

(GEN_RANDOM_UUID(), 'd8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43', 'gate-d8085d8f-entry', 'entry',
 'gate.closed', 'CLOSED', 'OPEN', NULL, 'auto_close_timeout',
 NOW() - INTERVAL '5 hours 28 minutes', '{"scenario": "normal_entry"}'),

-- exit gate blocked (unreadable plate)
(GEN_RANDOM_UUID(), 'd8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43', 'gate-d8085d8f-exit', 'exit',
 'gate.blocked', 'BLOCKED', 'CLOSED', NULL, 'ocr_failure',
 NOW() - INTERVAL '3 hours', '{"scenario": "ocr_failure", "ocrEventType": "ocr.plate.unreadable"}'),

(GEN_RANDOM_UUID(), 'd8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43', 'gate-d8085d8f-exit', 'exit',
 'gate.closed', 'CLOSED', 'BLOCKED', NULL, 'block_timeout_reset',
 NOW() - INTERVAL '2 hours 55 minutes', '{"scenario": "ocr_failure"}'),

(GEN_RANDOM_UUID(), 'd8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43', 'gate-d8085d8f-exit', 'exit',
 'gate.opened', 'OPEN', 'CLOSED', 'DA-43-GH', 'valid_ocr_read',
 NOW() - INTERVAL '2 hours 30 minutes', '{"scenario": "normal_exit"}'),

(GEN_RANDOM_UUID(), 'd8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43', 'gate-d8085d8f-exit', 'exit',
 'gate.closed', 'CLOSED', 'OPEN', NULL, 'auto_close_timeout',
 NOW() - INTERVAL '2 hours 28 minutes', '{"scenario": "normal_exit"}'),

-- ── Europa Aveiro (LE1) — 070b4f4d ───────────────────────────────────────────

(GEN_RANDOM_UUID(), '070b4f4d-9a9e-5c4a-92bd-eae711ecb6b3', 'gate-070b4f4d-entry', 'entry',
 'gate.opened', 'OPEN', 'CLOSED', '10-AB-21', 'valid_ocr_read',
 NOW() - INTERVAL '2 hours', '{"scenario": "normal_entry"}'),

(GEN_RANDOM_UUID(), '070b4f4d-9a9e-5c4a-92bd-eae711ecb6b3', 'gate-070b4f4d-entry', 'entry',
 'gate.closed', 'CLOSED', 'OPEN', NULL, 'auto_close_timeout',
 NOW() - INTERVAL '1 hour 58 minutes', '{"scenario": "normal_entry"}'),

-- stuck-closed fault
(GEN_RANDOM_UUID(), '070b4f4d-9a9e-5c4a-92bd-eae711ecb6b3', 'gate-070b4f4d-entry', 'entry',
 'gate.fault', 'FAULT', 'CLOSED', NULL, 'stuck_closed',
 NOW() - INTERVAL '1 hour 30 minutes', '{"scenario": "stuck_closed"}'),

(GEN_RANDOM_UUID(), '070b4f4d-9a9e-5c4a-92bd-eae711ecb6b3', 'gate-070b4f4d-entry', 'entry',
 'gate.recovered', 'CLOSED', 'FAULT', NULL, 'fault_recovered',
 NOW() - INTERVAL '1 hour 20 minutes', '{"scenario": "stuck_closed"}'),

(GEN_RANDOM_UUID(), '070b4f4d-9a9e-5c4a-92bd-eae711ecb6b3', 'gate-070b4f4d-exit', 'exit',
 'gate.opened', 'OPEN', 'CLOSED', '22-CD-32', 'valid_ocr_read',
 NOW() - INTERVAL '45 minutes', '{"scenario": "normal_exit"}'),

(GEN_RANDOM_UUID(), '070b4f4d-9a9e-5c4a-92bd-eae711ecb6b3', 'gate-070b4f4d-exit', 'exit',
 'gate.closed', 'CLOSED', 'OPEN', NULL, 'auto_close_timeout',
 NOW() - INTERVAL '43 minutes', '{"scenario": "normal_exit"}'),

-- ── EasySpot EV Hub (EV1) — ee000001 ────────────────────────────────────────

(GEN_RANDOM_UUID(), 'ee000001-0000-0000-0000-000000000001', 'gate-ee000001-entry', 'entry',
 'gate.opened', 'OPEN', 'CLOSED', 'EA-54-IJ', 'valid_ocr_read',
 NOW() - INTERVAL '1 hour', '{"scenario": "normal_entry"}'),

(GEN_RANDOM_UUID(), 'ee000001-0000-0000-0000-000000000001', 'gate-ee000001-entry', 'entry',
 'gate.closed', 'CLOSED', 'OPEN', NULL, 'auto_close_timeout',
 NOW() - INTERVAL '58 minutes', '{"scenario": "normal_entry"}'),

(GEN_RANDOM_UUID(), 'ee000001-0000-0000-0000-000000000001', 'gate-ee000001-exit', 'exit',
 'gate.opened', 'OPEN', 'CLOSED', 'FA-65-KL', 'valid_ocr_read',
 NOW() - INTERVAL '30 minutes', '{"scenario": "normal_exit"}'),

(GEN_RANDOM_UUID(), 'ee000001-0000-0000-0000-000000000001', 'gate-ee000001-exit', 'exit',
 'gate.closed', 'CLOSED', 'OPEN', NULL, 'auto_close_timeout',
 NOW() - INTERVAL '28 minutes', '{"scenario": "normal_exit"}')

ON CONFLICT DO NOTHING;

COMMIT;
