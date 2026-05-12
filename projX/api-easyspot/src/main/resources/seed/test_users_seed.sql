-- Seed: test users for TECHNICAL and MANAGER roles
-- test_technical (Laura Farias equivalent): parks in Aveiro
-- test_technical2 (Rui Ferreira): parks in Coimbra/Leiria — different from test_technical

INSERT INTO users (
    id, authentik_user_id, email, name, role,
    notifications_enabled, push_notifications_enabled,
    email_notifications_enabled, created_at, updated_at
) VALUES (
    '80de0901-9dee-4123-b884-d9b2f99891dd',
    '631f66745fa5826b06a97d8cf9d53503df551fc488e17e8ed2fccad0c8f2db5f',
    'technical@easyspot.local',
    'Test Technical',
    'TECHNICAL',
    TRUE, TRUE, TRUE,
    NOW(), NOW()
) ON CONFLICT DO NOTHING;

INSERT INTO users (
    id, authentik_user_id, email, name, role,
    notifications_enabled, push_notifications_enabled,
    email_notifications_enabled, created_at, updated_at
) VALUES (
    '8d1b2b9b-e5d5-4de7-98c9-ff1d379f3c36',
    '9a8eeb12a25b472a3ebba5402e2b96e31a13516992d0af53f943125fe0c0b78f',
    'technical2@easyspot.local',
    'Rui Ferreira',
    'TECHNICAL',
    TRUE, TRUE, TRUE,
    NOW(), NOW()
) ON CONFLICT DO NOTHING;

-- test_technical parks: Fórum Aveiro, Glicínias Plaza, EasySpot EV Hub Aveiro
INSERT INTO technician_park_assignments (id, technician_id, parking_lot_id) VALUES
    ('31e8cb3f-8a94-4cd4-8cf7-4f913b68a74c', '80de0901-9dee-4123-b884-d9b2f99891dd', '4731819f-a806-5c1f-be8c-a478d4276840'),
    ('57468ead-fab7-420b-a74c-9aee4d99fd2b', '80de0901-9dee-4123-b884-d9b2f99891dd', 'd8085d8f-7aaa-5eb4-b47d-2e2fe79bfe43'),
    ('1225e501-0e3e-4bcd-9aa1-3c2c2de0b555', '80de0901-9dee-4123-b884-d9b2f99891dd', 'ee000001-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- test_technical2 parks: Estádio Cidade de Coimbra, CoimbraShopping, Europa (Leiria)
INSERT INTO technician_park_assignments (id, technician_id, parking_lot_id) VALUES
    ('a1000001-0000-0000-0000-000000000001', '8d1b2b9b-e5d5-4de7-98c9-ff1d379f3c36', 'b231a846-7d40-5100-ba29-b9c0ca0ef9aa'),
    ('a1000001-0000-0000-0000-000000000002', '8d1b2b9b-e5d5-4de7-98c9-ff1d379f3c36', '452ed8eb-d0a3-5d61-8428-572e946614a5'),
    ('a1000001-0000-0000-0000-000000000003', '8d1b2b9b-e5d5-4de7-98c9-ff1d379f3c36', '070b4f4d-9a9e-5c4a-92bd-eae711ecb6b3')
ON CONFLICT DO NOTHING;
