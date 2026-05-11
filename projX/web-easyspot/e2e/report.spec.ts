import { test, expect, type Page } from '@playwright/test';

async function waitForLoaded(page: Page) {
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {});
}

const jwt =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSIsIm5hbWUiOiJBbmEgU2lsdmEiLCJlbWFpbCI6ImFuYUBlYXN5c3BvdC5wdCIsImdyb3VwcyI6WyJEUklWRVIiXSwiaXNzIjoiaHR0cDovL2xvY2FsaG9zdC9hdXRoZW50aWsvYXBwbGljYXRpb24vby9lYXN5c3BvdC8iLCJleHAiOjk5OTk5OTk5OTl9.fake-sig';

const parksList = {
  items: [
    { id: 'park-1', name: 'Parque Central', city: 'Aveiro', address: 'Rua Central, Aveiro', latitude: 40.6, longitude: -8.6, openingHours: '24h', pricePerHour: 1.5, totalSpaces: 50, freeSpaces: 10, evChargers: { available: 0, total: 0 }, accessibleSpaces: { available: 1, total: 2 }, availabilityStatus: 'AVAILABLE' },
    { id: 'park-2', name: 'Forum Aveiro', city: 'Aveiro', address: 'Fórum Aveiro', latitude: 40.6, longitude: -8.6, openingHours: '24h', pricePerHour: 1.2, totalSpaces: 100, freeSpaces: 20, evChargers: { available: 0, total: 0 }, accessibleSpaces: { available: 0, total: 0 }, availabilityStatus: 'AVAILABLE' },
  ],
  pagination: { page: 1, pageSize: 500, totalItems: 2, totalPages: 1 },
};

const parkDetails = {
  id: 'park-1',
  name: 'Parque Central',
  address: 'Rua Central, Aveiro',
  coordinates: { lat: 40.6, lng: -8.6 },
  openingHours: '24h',
  totalSpaces: 50,
  freeSpaces: 10,
  zones: [{ zoneName: 'STANDARD', total: 50, free: 10 }],
  spotMap: [{ spotNumber: 'A1', zone: 'STANDARD', row: 1, col: 1, status: 'free' }],
  evChargers: [],
  accessibility: [
    { location: 'Zona A - Piso 0', availability: true, distanceToEntranceMeters: 12, baySize: '4.0m x 5.0m', monitored: true, hasRampSpace: true, sensorStatus: 'online', ledStatus: 'green' },
  ],
  tariffs: [{ pricePerHour: 1.5, maxDaily: 15, monthly: 100 }],
  amenities: ['wc'],
  hourlyRate: 1.5,
  is24h: true,
  floors: [{ id: 'f1', name: 'Piso 0', spots: [{ id: 's1', label: 'A1', row: 1, col: 1, status: 'free' }] }],
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((token) => {
    sessionStorage.setItem('es_access_token', token);
    sessionStorage.setItem('es_id_token', token);
    localStorage.setItem('easyspot_vehicles', JSON.stringify([
      { id: 'v1', plate: 'AA-11-BB', isEV: false, isAccessible: false, isPrimary: true, chargerTypes: [] },
    ]));
  }, jwt);

  await page.route('**/api/vehicles', async (route) => {
    await route.fulfill({ json: [{ id: 'v1', plate: 'AA-11-BB', isEv: false, isAccessible: false, isPrimary: true }] });
  });
  await page.route('**/api/parks/cities', async (route) => { await route.fulfill({ json: ['Coimbra'] }); });
  await page.route('**/api/parks/list**', async (route) => {
    await route.fulfill({ json: parksList });
  });
  await page.route('**/api/parks/park-1/details', async (route) => { await route.fulfill({ json: parkDetails }); });
  await page.route('**/api/profile', async (route) => {
    await route.fulfill({ json: {
      role: 'DRIVER', name: 'Ana Silva', email: 'ana@easyspot.pt', photoUrl: null,
      notificationsEnabled: true, driverType: 'standard', pushNotificationsEnabled: true,
      emailNotificationsEnabled: true, spending: { totalEuros: 0, sessionCount: 0, avgEuros: 0 }, favoritesCount: 0,
    } });
  });
  await page.route('**/api/payments/setup-status', async (route) => {
    await route.fulfill({ json: { configured: true } });
  });
  await page.route('**/api/reports', async (route) => {
    await route.fulfill({
      status: 201,
      json: {
        id: 'REP123456',
        type: 'CLIENT',
        parkId: 'park-1',
        parkName: 'Parque Central',
        zone: 'Zona A',
        spotNumber: 'A-07',
        plate: null,
        description: 'Mock report',
        photoUrl: null,
        severity: 'WARNING',
        state: 'OPEN',
        createdAt: new Date().toISOString(),
      },
    });
  });
});

// ── Acesso à página de reporte ───────────────────────────────────────────────

test('Página de reporte abre diretamente via URL', async ({ page }) => {
  await page.goto('/report');
  await expect(page.getByRole('heading', { name: /Reportar Estacionamento/i })).toBeVisible();
});

test('Página de reporte mostra campos obrigatórios', async ({ page }) => {
  await page.goto('/report');
  await expect(page.getByLabel(/Parque de Estacionamento/i)).toBeVisible();
  await expect(page.getByLabel(/Zona \/ Piso/i)).toBeVisible();
  await expect(page.getByLabel(/Número do Lugar/i)).toBeVisible();
  await expect(page.getByLabel(/Descrição da Situação/i)).toBeVisible();
});

test('Link de reporte na tab Acessibilidade navega para /report', async ({ page }) => {
  await page.goto('/parking/park-1');
  await waitForLoaded(page);
  await page.getByRole('button', { name: /Acess/i }).click();
  const link = page.getByRole('link', { name: /Reportar/i }).first();
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/\/report/);
  await expect(page.getByRole('heading', { name: /Reportar Estacionamento/i })).toBeVisible();
});

test('Link de reporte passa o parkId como query param', async ({ page }) => {
  await page.goto('/parking/park-1');
  await waitForLoaded(page);
  await page.getByRole('button', { name: /Acess/i }).click();
  const link = page.getByRole('link', { name: /Reportar/i }).first();
  const href = await link.getAttribute('href');
  expect(href).toMatch(/parkId=park-1/);
});

// ── Validação do formulário ──────────────────────────────────────────────────

test('Submissão sem campos obrigatórios mostra erros de validação', async ({ page }) => {
  await page.goto('/report');
  await page.getByRole('button', { name: /Enviar Denúncia/i }).click();
  await expect(page.getByText(/Selecione um parque/i)).toBeVisible();
  await expect(page.getByText(/Indique a zona/i)).toBeVisible();
  await expect(page.getByText(/Indique o número do lugar/i)).toBeVisible();
  await expect(page.getByText(/descrição deve ter pelo menos/i)).toBeVisible();
});

test('Descrição curta mostra erro de validação', async ({ page }) => {
  await page.goto('/report');
  await page.getByLabel(/Descrição da Situação/i).fill('curto');
  await page.getByRole('button', { name: /Enviar Denúncia/i }).click();
  await expect(page.getByText(/descrição deve ter pelo menos/i)).toBeVisible();
});

// ── Fluxo de submissão ───────────────────────────────────────────────────────

test('Submissão válida avança para confirmação com ID de reporte', async ({ page }) => {
  await page.goto('/report?parkId=park-1');

  const parkSelect = page.getByLabel(/Parque de Estacionamento/i);
  await parkSelect.waitFor({ state: 'visible' });
  await parkSelect.selectOption('park-1').catch(() => {});

  await page.getByLabel(/Zona \/ Piso/i).fill('Zona A');
  await page.getByLabel(/Número do Lugar/i).fill('A-07');
  await page.getByLabel(/Descrição da Situação/i).fill('Veículo sem dístico estacionado no lugar reservado desde as 14h.');

  await page.getByRole('button', { name: /Lugar de Mobilidade Reduzida/i }).first().click();

  await page.getByRole('button', { name: /Enviar Denúncia/i }).click();
  await expect(page.getByText(/REP\d+/)).toBeVisible({ timeout: 5000 });
});

test('Botão Cancelar na página de reporte navega para trás', async ({ page }) => {
  await page.goto('/parking/park-1');
  await waitForLoaded(page);
  await page.getByRole('button', { name: /Acess/i }).click();
  await page.getByRole('link', { name: /Reportar/i }).first().click();
  await expect(page).toHaveURL(/\/report/);
  await page.getByRole('button', { name: /Cancelar/i }).click();
  await expect(page).toHaveURL(/\/parking\/park-1/);
});

test('Submissão com formulário incompleto mostra mensagens de erro', async ({ page }) => {
  await page.goto('/report');
  await expect(page.getByText(/Reportar Estacionamento/i)).toBeVisible();

  await page.getByRole('button', { name: /Enviar Denúncia/i }).click();

  await expect(page.getByText(/Selecione um parque/i)).toBeVisible();
  await expect(page.getByText(/Indique a zona/i)).toBeVisible();
  await expect(page.getByText(/Indique o número do lugar/i)).toBeVisible();
  await expect(page.getByText(/Selecione o tipo de infração/i)).toBeVisible();
  await expect(page.getByText(/A descrição deve ter/i)).toBeVisible();
  await expect(page.getByText(/Denúncia Enviada/i)).not.toBeVisible();
});

test('Erro do backend mostra mensagem de erro inline', async ({ page }) => {
  await page.goto('/report');
  await expect(page.getByText(/Reportar Estacionamento/i)).toBeVisible();

  await page.getByRole('combobox').selectOption({ value: 'park-1' });
  await page.getByPlaceholder(/Ex: Piso -1, Zona A/i).fill('A');
  await page.getByPlaceholder(/Ex: A-07, MR-02/i).fill('A-01');
  await page.getByRole('button', { name: /A Bloquear Acesso/i }).click();
  await page.getByPlaceholder(/Descreva o que observou/i).fill(
    'Veículo bloqueia completamente a saída de emergência do parque.',
  );

  await page.route('**/api/reports', (route) =>
    route.fulfill({ status: 500, body: JSON.stringify({ message: 'Erro interno do servidor' }) }),
  );

  await page.getByRole('button', { name: /Enviar Denúncia/i }).click();

  await expect(page.getByText(/Erro interno do servidor/i)).toBeVisible();
  await expect(page.getByText(/Denúncia Enviada/i)).not.toBeVisible();
});

test('Após confirmação, clicar em Nova Denúncia volta ao formulário limpo', async ({ page }) => {
  await page.goto('/report');
  await expect(page.getByText(/Reportar Estacionamento/i)).toBeVisible();

  await page.getByRole('combobox').selectOption({ value: 'park-2' });
  await page.getByPlaceholder(/Ex: Piso -1, Zona A/i).fill('B');
  await page.getByPlaceholder(/Ex: A-07, MR-02/i).fill('B-10');
  await page.getByRole('button', { name: /Lugar de Carregamento EV/i }).click();
  await page.getByPlaceholder(/Descreva o que observou/i).fill(
    'Veículo a gasóleo no lugar EV bloqueando carregadores há mais de 3 horas.',
  );

  await page.route('**/api/reports', (route) =>
    route.fulfill({
      status: 201,
      json: {
        id: 'REP654321', type: 'CLIENT', parkId: 'park-2', parkName: 'Forum Aveiro',
        zone: 'B', spotNumber: 'B-10', plate: null,
        description: 'Veículo a gasóleo no lugar EV.',
        photoUrl: null, severity: 'WARNING', state: 'OPEN', createdAt: new Date().toISOString(),
      },
    }),
  );

  await page.getByRole('button', { name: /Enviar Denúncia/i }).click();
  await expect(page.getByText(/REP\d+/)).toBeVisible({ timeout: 5000 });

  await page.getByRole('button', { name: /Nova Denúncia/i }).click();

  await expect(page.getByText(/Reportar Estacionamento/i)).toBeVisible();
  await expect(page.getByRole('combobox')).toHaveValue('');
});
