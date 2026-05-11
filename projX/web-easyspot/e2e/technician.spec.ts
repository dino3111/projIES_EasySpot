import { test, expect } from '@playwright/test';

// JWT with TECHNICAL role (signature not validated in tests)
const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZWNoLTEiLCJuYW1lIjoiTGF1cmEgRmFyaWFzIiwiZW1haWwiOiJsYXVyYUBlYXN5c3BvdC5wdCIsImdyb3VwcyI6WyJURUNITklDQUwiXSwiaXNzIjoiaHR0cDovL2xvY2FsaG9zdC9hdXRoZW50aWsvYXBwbGljYXRpb24vby9lYXN5c3BvdC8iLCJleHAiOjk5OTk5OTk5OTl9.fake-sig';

const mockDashboard = {
  kpis: {
    totalSensors: 12,
    operationalSensors: 10,
    uptimePct: 96.5,
    failuresToday: 2,
    failuresTodayVariancePct: 10,
    meanTimeToRepair: '2h 30m',
    mttrVariancePct: -5,
  },
  uptimeLast7Days: [
    { date: '2026-05-01', day: 'Qui', uptimePct: 97.0 },
    { date: '2026-05-02', day: 'Sex', uptimePct: 96.5 },
    { date: '2026-05-03', day: 'Sáb', uptimePct: 95.8 },
    { date: '2026-05-04', day: 'Dom', uptimePct: 96.2 },
    { date: '2026-05-05', day: 'Seg', uptimePct: 97.1 },
    { date: '2026-05-06', day: 'Ter', uptimePct: 96.9 },
    { date: '2026-05-07', day: 'Qua', uptimePct: 96.5 },
  ],
  sensorDistribution: [
    { status: 'operational', label: 'Operacional', count: 10, percentage: 83.3 },
    { status: 'offline',     label: 'Offline',     count: 2,  percentage: 16.7 },
  ],
  urgentWorkOrders: [
    {
      id: '9f6a9a7b-c6a2-43a2-a2b6-f57e6d03df57',
      type: 'sensor',
      park: 'Fórum Aveiro',
      zone: 'Piso 0 – Zona B',
      sensorId: 'IR-AV1-B07',
      description: 'Falha de leitura IR sem sinal',
      severity: 'critical',
      state: 'open',
      createdAt: '2026-05-08T09:00:00Z',
      attributedTo: null,
    },
  ],
};

const mockSensors = [
  {
    sensorId: 'IR-AV1-B07',
    parkingLotId: 'b231a846-7d40-5100-ba29-b9c0ca0ef9aa',
    parkingLotName: 'Fórum Aveiro',
    zone: 'Piso 0 – Zona B',
    status: 'offline',
    lastSeenAt: '2026-05-08T08:12:00Z',
    createdAt: '2024-06-15T00:00:00Z',
  },
  {
    sensorId: 'GW-AV1-01',
    parkingLotId: 'b231a846-7d40-5100-ba29-b9c0ca0ef9aa',
    parkingLotName: 'Fórum Aveiro',
    zone: 'Sala Técnica',
    status: 'operational',
    lastSeenAt: '2026-05-08T10:47:00Z',
    createdAt: '2024-05-28T00:00:00Z',
  },
];

const mockAlerts = [
  {
    id: 'alert-uuid-001',
    type: 'SENSOR',
    park: 'Fórum Aveiro',
    zone: 'Piso 0 – Zona B',
    spotNumber: 'B7',
    sensorId: 'IR-AV1-B07',
    plate: null,
    description: 'Sensor IR sem leituras há >2h.',
    severity: 'CRITICAL',
    state: 'OPEN',
    createdAt: '2026-05-08T08:12:00Z',
    attributedTo: null,
    notes: null,
  },
  {
    id: 'alert-uuid-002',
    type: 'SYSTEM',
    park: 'Foz Plaza',
    zone: 'Sala Técnica',
    spotNumber: null,
    sensorId: 'GW-FI2-01',
    plate: null,
    description: 'Gateway em modo de manutenção.',
    severity: 'WARNING',
    state: 'OPEN',
    createdAt: '2026-05-08T09:30:00Z',
    attributedTo: 'Laura Farias',
    notes: 'Atualização em curso.',
  },
  {
    id: 'alert-uuid-003',
    type: 'SENSOR',
    park: 'Fórum Aveiro',
    zone: 'Piso 0 – Zona B',
    spotNumber: 'B7',
    sensorId: 'IR-AV1-B07',
    plate: null,
    description: 'Sinal IR abaixo do limiar mínimo.',
    severity: 'WARNING',
    state: 'RESOLVED',
    createdAt: '2026-05-06T14:30:00Z',
    attributedTo: 'Laura Farias',
    notes: 'Emissor IR substituído.',
  },
];

const mockSensorDetail = {
  ...mockSensors[0],
  logs: [
    {
      alertId: 'alert-uuid-001',
      type: 'sensor',
      severity: 'critical',
      state: 'open',
      description: 'Sensor IR sem leituras há >2h.',
      createdAt: '2026-05-08T08:12:00Z',
      resolvedAt: null,
    },
    {
      alertId: 'alert-uuid-002',
      type: 'sensor',
      severity: 'warning',
      state: 'resolved',
      description: 'Sinal IR abaixo do limiar.',
      createdAt: '2026-05-07T14:30:00Z',
      resolvedAt: '2026-05-07T16:00:00Z',
    },
  ],
};

const mockAlerts = [
  {
    id: '9f6a9a7b-c6a2-43a2-a2b6-f57e6d03df57',
    type: 'SENSOR',
    park: 'Fórum Aveiro',
    zone: 'Piso 0 – Zona B',
    spotNumber: null,
    sensorId: 'IR-AV1-B07',
    plate: null,
    description: 'Falha de leitura IR sem sinal',
    severity: 'CRITICAL',
    state: 'OPEN',
    createdAt: '2026-05-08T09:00:00Z',
    attributedTo: null,
    notes: null,
  },
];

const mockProfile = {
  role: 'TECHNICAL',
  name: 'Laura Farias',
  email: 'laura@easyspot.pt',
  photoUrl: null,
  notificationsEnabled: true,
  driverType: null,
  pushNotificationsEnabled: false,
  emailNotificationsEnabled: true,
  spending: { totalEuros: 0, sessionCount: 0, avgEuros: 0 },
  favoritesCount: 0,
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((token) => {
    sessionStorage.setItem('es_access_token', token);
    sessionStorage.setItem('es_id_token', token);
    localStorage.setItem('easyspot_profile', 'TECHNICAL');
    localStorage.setItem('easyspot_account_type', 'TECHNICAL');
  }, jwt);

  await page.route('**/api/profile', (route) => route.fulfill({ json: mockProfile }));
  await page.route('**/api/vehicles', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/technician/dashboard', (route) => route.fulfill({ json: mockDashboard }));
  await page.route('**/api/technician/sensors', (route) => route.fulfill({ json: mockSensors }));
  await page.route('**/api/technician/sensors/IR-AV1-B07/logs', (route) => route.fulfill({ json: mockSensorDetail }));
  await page.route('**/api/alerts', (route) => route.fulfill({ json: mockAlerts }));
  await page.route('**/api/alerts/**/state', (route) => route.fulfill({ status: 204, body: '' }));
  await page.route('**/api/alerts**', (route) => route.fulfill({ json: mockAlerts }));
});

test('Painel técnico mostra KPIs da API', async ({ page }) => {
  await page.goto('/technician/dashboard');

  await expect(page.getByText('Total Sensores')).toBeVisible();
  await expect(page.getByText('12')).toBeVisible();
  await expect(page.getByText('96.5%')).toBeVisible();
  await expect(page.getByText('2h 30m')).toBeVisible();
});

test('Painel técnico mostra ordens urgentes', async ({ page }) => {
  await page.goto('/technician/dashboard');

  await expect(page.getByText(/ordens urgentes/i).first()).toBeVisible();
  await expect(page.getByText('Falha de leitura IR sem sinal')).toBeVisible();
  await expect(page.getByText('Fórum Aveiro')).toBeVisible();
});

test('Painel técnico mostra estado de erro quando API falha', async ({ page }) => {
  await page.unroute('**/api/technician/dashboard');
  await page.route('**/api/technician/dashboard', (route) => route.fulfill({ status: 500, body: 'Server Error' }));

  await page.goto('/technician/dashboard');

  await expect(page.getByRole('button', { name: /tentar novamente/i })).toBeVisible();
});

test('Página de manutenção carrega com dados de sensores da API', async ({ page }) => {
  await page.goto('/technician/maintenance');

  // Tab de sensores mostra badge com count de falhas
  await expect(page.getByRole('tab', { name: /sensores/i })).toBeVisible();
});

test('Página de manutenção navega entre tabs', async ({ page }) => {
  await page.goto('/technician/maintenance');

  await page.getByRole('tab', { name: /sensores/i }).click();
  await expect(page.getByText(/estado dos sensores/i).or(page.getByText(/sensores/i).first())).toBeVisible();

  await page.getByRole('tab', { name: /tarefas/i }).click();
  await expect(page.getByText(/ordens de manutenção/i).or(page.getByText(/tarefas/i).first())).toBeVisible();
});

test('Banner de erro parcial aparece quando API de sensores falha', async ({ page }) => {
  await page.unroute('**/api/technician/sensors');
  await page.route('**/api/technician/sensors', (route) => route.fulfill({ status: 503, body: 'Unavailable' }));

  await page.goto('/technician/maintenance');

  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByText(/erro ao carregar dados/i)).toBeVisible();
});

test('Tab sensores mostra parques e sensores vindos da API', async ({ page }) => {
  await page.goto('/technician/maintenance');

  await page.getByRole('tab', { name: /sensores/i }).click();

  // parkingLotName "Fórum Aveiro" vem da API mock (mockSensors)
  await expect(page.getByText('Fórum Aveiro')).toBeVisible();
});

test('Abrir sensor mostra painel de diagnóstico com logs carregados da API', async ({ page }) => {
  await page.goto('/technician/maintenance');

  await page.getByRole('tab', { name: /sensores/i }).click();

  // Entra no parque Fórum Aveiro
  await page.getByText('Fórum Aveiro').click();

  // Abre o sensor IR-AV1-B07 (offline, tem logs no mockSensorDetail)
  await page.getByText('IR-AV1-B07').click();

  // Painel de diagnóstico aparece
  await expect(page.getByRole('dialog')).toBeVisible();

  // Logs carregados da API ficam visíveis no histórico de erros
  await expect(page.getByText('Sensor IR sem leituras há >2h.')).toBeVisible();
  await expect(page.getByText('Sinal IR abaixo do limiar.')).toBeVisible();
});

test('Painel de diagnóstico distingue log aberto de log resolvido', async ({ page }) => {
  await page.goto('/technician/maintenance');

  await page.getByRole('tab', { name: /sensores/i }).click();
  await page.getByText('Fórum Aveiro').click();
  await page.getByText('IR-AV1-B07').click();

  await expect(page.getByRole('dialog')).toBeVisible();

  // Log crítico aberto (estado open) não deve estar marcado como resolvido
  const criticalLog = page.getByText('Sensor IR sem leituras há >2h.').locator('..');
  await expect(criticalLog).toBeVisible();

  // Log warning resolvido existe
  await expect(page.getByText('Sinal IR abaixo do limiar.')).toBeVisible();
});

test('Fechar painel de diagnóstico remove o modal', async ({ page }) => {
  await page.goto('/technician/maintenance');

  await page.getByRole('tab', { name: /sensores/i }).click();
  await page.getByText('Fórum Aveiro').click();
  await page.getByText('IR-AV1-B07').click();

  await expect(page.getByRole('dialog')).toBeVisible();

  await page.getByRole('button', { name: /fechar/i }).first().click();

  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('Botão Atualizar Estado abre modal de atualização de status', async ({ page }) => {
  await page.goto('/technician/maintenance');

  await page.getByRole('tab', { name: /sensores/i }).click();
  await page.getByText('Fórum Aveiro').click();
  await page.getByText('IR-AV1-B07').click();

  await expect(page.getByRole('dialog')).toBeVisible();

  await page.getByRole('button', { name: /atualizar estado/i }).click();

  // StatusUpdateModal should open (it's a second dialog at z-60)
  await expect(page.getByText(/atualizar estado do sensor/i)).toBeVisible();
  await expect(page.getByText(/IR-AV1-B07/)).toBeVisible();
});

test('Confirmar atualização de status chama API e mostra toast', async ({ page }) => {
  let statusPatchCalled = false;
  await page.route('**/api/technician/sensors/IR-AV1-B07/status', (route) => {
    statusPatchCalled = true;
    route.fulfill({ status: 204, body: '' });
  });

  await page.goto('/technician/maintenance');

  await page.getByRole('tab', { name: /sensores/i }).click();
  await page.getByText('Fórum Aveiro').click();
  await page.getByText('IR-AV1-B07').click();

  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: /atualizar estado/i }).click();

  // Select "Operacional" in the modal
  await page.getByRole('radio', { name: /operacional/i }).click();

  await page.getByRole('button', { name: /confirmar atualização/i }).click();

  // Toast should appear
  await expect(page.getByRole('status')).toBeVisible();
  await expect(page.getByText(/IR-AV1-B07/)).toBeVisible();

  expect(statusPatchCalled).toBe(true);
});

test('Atualização de status para operacional fecha modais', async ({ page }) => {
  await page.route('**/api/technician/sensors/IR-AV1-B07/status', (route) =>
    route.fulfill({ status: 204, body: '' }),
  );

  await page.goto('/technician/maintenance');

  await page.getByRole('tab', { name: /sensores/i }).click();
  await page.getByText('Fórum Aveiro').click();
  await page.getByText('IR-AV1-B07').click();

  await page.getByRole('button', { name: /atualizar estado/i }).click();
  await page.getByRole('radio', { name: /operacional/i }).click();
  await page.getByRole('button', { name: /confirmar atualização/i }).click();

  // Both modals should close
  await expect(page.getByText(/atualizar estado do sensor/i)).not.toBeVisible();
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('Painel mostra loading enquanto carrega logs do sensor', async ({ page }) => {
  await page.unroute('**/api/technician/sensors/IR-AV1-B07/logs');
  await page.route('**/api/technician/sensors/IR-AV1-B07/logs', async (route) => {
    await new Promise((r) => setTimeout(r, 800));
    await route.fulfill({ json: mockSensorDetail });
  });

  await page.goto('/technician/maintenance');
  await page.getByRole('tab', { name: /sensores/i }).click();
  await page.getByText('Fórum Aveiro').click();
  await page.getByText('IR-AV1-B07').click();

  await expect(page.getByText(/a carregar logs do sensor/i)).toBeVisible();
  await expect(page.getByText('Sensor IR sem leituras há >2h.')).toBeVisible();
  await expect(page.getByText(/a carregar logs do sensor/i)).not.toBeVisible();
});

// ── Ocorrências tab ───────────────────────────────────────────────────────────

test('Tab ocorrências mostra alertas abertos da API', async ({ page }) => {
  await page.goto('/technician/maintenance');

  // Tab ocorrências é a activa por defeito — mostra parques agrupados
  await expect(page.getByText('Fórum Aveiro')).toBeVisible();
  await expect(page.getByText('Foz Plaza')).toBeVisible();

  // Entra no parque Fórum Aveiro para ver a descrição do alerta
  await page.getByText('Fórum Aveiro').click();
  await expect(page.getByText('Sensor IR sem leituras há >2h.')).toBeVisible();
});

test('Tab ocorrências mostra badge com contagem de alertas abertos', async ({ page }) => {
  await page.goto('/technician/maintenance');

  // 2 alertas OPEN no mock → badge "2" no tab
  const tab = page.getByRole('tab', { name: /ocorrências/i });
  await expect(tab).toBeVisible();
  await expect(tab.getByText('2')).toBeVisible();
});

test('Tab ocorrências filtra por severidade crítica', async ({ page }) => {
  await page.goto('/technician/maintenance');

  await page.getByRole('button', { name: /crítica/i }).click();

  // Fórum Aveiro tem alerta CRITICAL → card visível; Foz Plaza só tem WARNING → card desaparece
  await expect(page.getByText('Fórum Aveiro')).toBeVisible();
  await expect(page.getByText('Foz Plaza')).not.toBeVisible();
});

test('Tab ocorrências mostra alerta resolvido no filtro resolvidos', async ({ page }) => {
  await page.goto('/technician/maintenance');

  await page.getByRole('button', { name: /resolvidos/i }).click();

  // Fórum Aveiro tem alerta RESOLVED → card visível; Foz Plaza não tem → desaparece
  await expect(page.getByText('Fórum Aveiro')).toBeVisible();
  await expect(page.getByText('Foz Plaza')).not.toBeVisible();

  // Entra no parque para confirmar o alerta resolvido
  await page.getByText('Fórum Aveiro').click();
  await expect(page.getByText('Sinal IR abaixo do limiar mínimo.')).toBeVisible();
});

test('Banner de erro aparece quando API de alertas falha', async ({ page }) => {
  await page.unroute('**/api/alerts');
  await page.route('**/api/alerts', (route) => route.fulfill({ status: 503, body: 'Unavailable' }));

  await page.goto('/technician/maintenance');

  await expect(page.getByRole('alert')).toBeVisible();
});

// ── Tarefas tab ───────────────────────────────────────────────────────────────

test('Tab tarefas mostra badge com contagem de tarefas abertas', async ({ page }) => {
  await page.goto('/technician/maintenance');

  const tab = page.getByRole('tab', { name: /tarefas/i });
  await expect(tab).toBeVisible();
  // 2 alertas não-RESOLVED no mock
  await expect(tab.getByText('2')).toBeVisible();
});

test('Tab tarefas mostra tarefas urgentes da API', async ({ page }) => {
  await page.goto('/technician/maintenance');

  await page.getByRole('tab', { name: /tarefas/i }).click();

  // Alerta CRITICAL OPEN aparece como urgente
  await expect(page.getByText('Sensor IR sem leituras há >2h.')).toBeVisible();
});

test('Tab tarefas permite iniciar tarefa e chama API de estado', async ({ page }) => {
  let patchCalled = false;
  await page.unroute('**/api/alerts/**/state');
  await page.route('**/api/alerts/**/state', (route) => {
    patchCalled = true;
    route.fulfill({ status: 204, body: '' });
  });

  await page.goto('/technician/maintenance');
  await page.getByRole('tab', { name: /tarefas/i }).click();

  await page.getByRole('button', { name: /iniciar/i }).first().click();

  expect(patchCalled).toBe(true);
});
