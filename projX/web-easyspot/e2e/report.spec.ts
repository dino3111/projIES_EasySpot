import { test, expect, type Page } from '@playwright/test';

async function waitForLoaded(page: Page) {
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {});
}

const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSIsIm5hbWUiOiJBbmEiLCJlbWFpbCI6ImFuYUBlYXN5c3BvdC5wdCIsImdyb3VwcyI6WyJEUklWRVIiXSwiaXNzIjoiaHR0cDovL2xvY2FsaG9zdC9hdXRoZW50aWsvYXBwbGljYXRpb24vby9lYXN5c3BvdC8iLCJleHAiOjk5OTk5OTk5OTl9.fake-sig';

const parks = [
  { id: 'park-1', name: 'Parque Central', city: 'Coimbra', address: 'Rua A, Coimbra', latitude: 40.2, longitude: -8.4,
    openingHours: '24h', pricePerHour: 1.5, totalSpaces: 50, freeSpaces: 10,
    evChargers: { available: 1, total: 2 }, accessibleSpaces: { available: 1, total: 2 } },
];

const parkDetails = {
  id: 'park-1', name: 'Parque Central', address: 'Rua A, Coimbra', coordinates: { lat: 40.2, lng: -8.4 },
  openingHours: '24h', totalSpaces: 50, freeSpaces: 10, zones: [],
  spotMap: [],
  evChargers: [],
  accessibility: [
    { location: 'Zona A - Piso 0', availability: true, distanceToEntranceMeters: 12, baySize: '4.0m x 5.0m',
      monitored: true, hasRampSpace: true, sensorStatus: 'online', ledStatus: 'green' },
  ],
  tariffs: [{ pricePerHour: 1.5, maxDaily: 12, monthly: 60 }], amenities: [],
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
    await route.fulfill({ json: { items: parks, pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 } } });
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
  await page.route('**/api/parks/summary**', async (route) => {
    await route.fulfill({ json: parks });
  });
  await page.route('**/api/parks**', async (route) => {
    await route.fulfill({ json: parks });
  });

  await page.goto('/report?parkId=park-1');

  const parkSelect = page.getByLabel(/Parque de Estacionamento/i);
  await parkSelect.waitFor({ state: 'visible' });
  await parkSelect.selectOption('park-1').catch(() => {});

  await page.getByLabel(/Zona \/ Piso/i).fill('Zona A');
  await page.getByLabel(/Número do Lugar/i).fill('A-07');
  await page.getByLabel(/Descrição da Situação/i).fill('Veículo sem dístico estacionado no lugar reservado desde as 14h.');

  const violationButton = page.getByRole('button', { name: /Lugar Acessível/i }).first();
  if (await violationButton.isVisible()) await violationButton.click();

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
