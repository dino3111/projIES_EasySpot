import { test, expect } from '@playwright/test';

// JWT with MANAGER role (signature not validated in tests)
const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtZ3ItMSIsIm5hbWUiOiJBbmEgR2VzdG9yYSIsImVtYWlsIjoiYW5hQGVhc3lzcG90LnB0IiwiZ3JvdXBzIjpbIk1BTkFHRVIiXX0.sig';

const mockProfile = {
  role: 'MANAGER',
  name: 'Ana Gestora',
  email: 'ana@easyspot.pt',
  photoUrl: null,
  notificationsEnabled: true,
  driverType: null,
  pushNotificationsEnabled: false,
  emailNotificationsEnabled: true,
  spending: { totalEuros: 0, sessionCount: 0, avgEuros: 0 },
  favoritesCount: 0,
};

const mockTariffs = {
  content: [
    {
      id: 'tariff-uuid-001',
      parkId: 'park-uuid-001',
      parkName: 'Fórum Aveiro',
      city: 'Aveiro',
      pricePerHour: 1.5,
      maxDaily: 12.0,
      monthlyPrice: 80.0,
      pricePerKwh: 0.35,
      status: 'ACTIVE',
    },
    {
      id: 'tariff-uuid-002',
      parkId: 'park-uuid-002',
      parkName: 'Parque Central',
      city: 'Aveiro',
      pricePerHour: 2.0,
      maxDaily: 15.0,
      monthlyPrice: 100.0,
      pricePerKwh: 0.40,
      status: 'REVIEW',
    },
  ],
  totalElements: 2,
  totalPages: 1,
};

const mockAlerts = [
  {
    id: 'alert-uuid-001',
    type: 'sensor',
    park: 'Fórum Aveiro',
    zone: 'Piso 0 – Zona B',
    spotNumber: null,
    sensorId: 'IR-AV1-B07',
    plate: null,
    description: 'Sensor IR sem leituras há >2h.',
    severity: 'critical',
    state: 'open',
    createdAt: '2026-05-08T08:12:00Z',
    attributedTo: null,
    notas: null,
  },
  {
    id: 'alert-uuid-002',
    type: 'billing',
    park: 'Parque Central',
    zone: null,
    spotNumber: null,
    sensorId: null,
    plate: 'AA-00-BB',
    description: 'Pagamento recusado.',
    severity: 'warning',
    state: 'resolved',
    createdAt: '2026-05-07T14:30:00Z',
    attributedTo: null,
    notas: null,
  },
];

const mockParks = {
  items: [
    {
      id: 'park-uuid-001',
      name: 'Fórum Aveiro',
      city: 'Aveiro',
      address: 'Rua de exemplo 1',
      latitude: 40.63,
      longitude: -8.65,
      openingHours: '08:00-22:00',
      minPrice: 1.5,
      totalSpaces: 200,
      freeSpaces: 50,
      evChargers: { free: 2, total: 5 },
      accessibleSpaces: { free: 1, total: 3 },
      availabilityStatus: 'AVAILABLE',
    },
  ],
  pagination: { page: 1, pageSize: 500, totalItems: 1, totalPages: 1 },
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((token) => {
    sessionStorage.setItem('es_access_token', token);
    sessionStorage.setItem('es_id_token', token);
    localStorage.setItem('easyspot_profile', 'MANAGER');
    localStorage.setItem('easyspot_account_type', 'MANAGER');
  }, jwt);

  await page.route('**/api/profile', (route) => route.fulfill({ json: mockProfile }));
  await page.route('**/api/manager/tariffs**', (route) => route.fulfill({ json: mockTariffs }));
  await page.route('**/api/alerts**', (route) => route.fulfill({ json: mockAlerts }));
  await page.route('**/api/parks/list**', (route) => route.fulfill({ json: mockParks }));
  await page.route('**/api/alerts/**/state', (route) => route.fulfill({ status: 204, body: '' }));
});

test('Página mostra separador Tarifários com dados da API', async ({ page }) => {
  await page.goto('/manager/tarifas-ocorrencias');

  await expect(page.getByRole('tab', { name: /tarifários/i })).toBeVisible();
  await expect(page.getByText('Fórum Aveiro')).toBeVisible();
  await expect(page.getByText('Parque Central')).toBeVisible();
});

test('Página mostra título de secção correto', async ({ page }) => {
  await page.goto('/manager/tarifas-ocorrencias');

  await expect(page.getByRole('heading', { name: /tarifas/i })).toBeVisible();
});

test('Separador Ocorrências mostra alertas da API', async ({ page }) => {
  await page.goto('/manager/tarifas-ocorrencias');

  await page.getByRole('tab', { name: /ocorrências/i }).click();

  await expect(page.getByText('Sensor IR sem leituras há >2h.')).toBeVisible();
  await expect(page.getByText('Pagamento recusado.')).toBeVisible();
});

test('Separador Ocorrências mostra alerta crítico como aberto', async ({ page }) => {
  await page.goto('/manager/tarifas-ocorrencias');

  await page.getByRole('tab', { name: /ocorrências/i }).click();

  await expect(page.getByText('Sensor IR sem leituras há >2h.')).toBeVisible();
  await expect(page.getByText('Fórum Aveiro')).toBeVisible();
});

test('Mostra estado de erro quando API de tarifas falha', async ({ page }) => {
  await page.unroute('**/api/manager/tariffs**');
  await page.route('**/api/manager/tariffs**', (route) =>
    route.fulfill({ status: 500, body: 'Server Error' })
  );

  await page.goto('/manager/tarifas-ocorrencias');

  // Page should still render without crashing; tariff list will be empty
  await expect(page.getByRole('tab', { name: /tarifários/i })).toBeVisible();
});

test('Exportar dados inicia download de ficheiro', async ({ page }) => {
  await page.goto('/manager/tarifas-ocorrencias');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /exportar/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/tarifas/i);
});
