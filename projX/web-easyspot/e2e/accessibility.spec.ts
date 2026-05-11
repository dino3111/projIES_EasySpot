import { test, expect } from '@playwright/test';

const jwt =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSIsIm5hbWUiOiJBbmEiLCJlbWFpbCI6ImFuYUBlYXN5c3BvdC5wdCIsImdyb3VwcyI6WyJEUklWRVIiXSwiaXNzIjoiaHR0cDovL2xvY2FsaG9zdC9hdXRoZW50aWsvYXBwbGljYXRpb24vby9lYXN5c3BvdC8iLCJleHAiOjk5OTk5OTk5OTl9.fake-sig';

const parkListResponse = {
  items: [
    {
      id: 'park-acc-1',
      name: 'Parque Acessível Central',
      city: 'Coimbra',
      address: 'Rua Central, Coimbra',
      latitude: 40.2,
      longitude: -8.4,
      openingHours: '24h',
      pricePerHour: 1.5,
      totalSpaces: 50,
      freeSpaces: 10,
      evChargers: { available: 0, total: 0 },
      accessibleSpaces: { available: 2, total: 3 },
    },
    {
      id: 'park-acc-2',
      name: 'Parque Norte',
      city: 'Aveiro',
      address: 'Av. Norte, Aveiro',
      latitude: 40.6,
      longitude: -8.6,
      openingHours: '08h - 22h',
      pricePerHour: 1.0,
      totalSpaces: 80,
      freeSpaces: 20,
      evChargers: { available: 1, total: 2 },
      accessibleSpaces: { available: 1, total: 2 },
    },
  ],
  pagination: { page: 1, pageSize: 200, totalItems: 2, totalPages: 1 },
};

const parkDetails1 = {
  id: 'park-acc-1',
  name: 'Parque Acessível Central',
  address: 'Rua Central, Coimbra',
  coordinates: { lat: 40.2, lng: -8.4 },
  openingHours: '24h',
  totalSpaces: 50,
  freeSpaces: 10,
  zones: [],
  spotMap: [],
  evChargers: [],
  accessibility: [
    { location: 'Zona A — Lugar 1', availability: true,  distanceToEntranceMeters: 8,  baySize: '4.0m x 5.5m' },
    { location: 'Zona A — Lugar 2', availability: true,  distanceToEntranceMeters: 10, baySize: '3.5m x 5.0m' },
    { location: 'Zona B — Lugar 1', availability: false, distanceToEntranceMeters: 25, baySize: '3.5m x 5.0m' },
  ],
  tariffs: [{ pricePerHour: 1.5, maxDaily: 12, monthly: 60 }],
  amenities: [],
};

const parkDetails2 = {
  id: 'park-acc-2',
  name: 'Parque Norte',
  address: 'Av. Norte, Aveiro',
  coordinates: { lat: 40.6, lng: -8.6 },
  openingHours: '08h - 22h',
  totalSpaces: 80,
  freeSpaces: 20,
  zones: [],
  spotMap: [],
  evChargers: [{ type: 'Type 2', speed: '22kW', pricePerKwh: 0.35, availability: true }],
  accessibility: [
    { location: 'Entrada — PMR-01', availability: true,  distanceToEntranceMeters: 12, baySize: '3.5m x 5.0m' },
    { location: 'Entrada — PMR-02', availability: false, distanceToEntranceMeters: 15, baySize: '4.0m x 5.5m' },
  ],
  tariffs: [{ pricePerHour: 1.0, maxDaily: 8, monthly: 50 }],
  amenities: [],
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((token) => {
    sessionStorage.setItem('es_access_token', token);
    sessionStorage.setItem('es_id_token', token);
  }, jwt);

  await page.route('**/api/profile', async (route) => {
    await route.fulfill({
      json: {
        role: 'DRIVER', name: 'Ana Silva', email: 'ana@easyspot.pt', photoUrl: null,
        notificationsEnabled: true, driverType: 'standard', pushNotificationsEnabled: false,
        emailNotificationsEnabled: true, spending: { totalEuros: 0, sessionCount: 0, avgEuros: 0 },
        favoritesCount: 0,
      },
    });
  });

  await page.route('**/api/parks/list**', async (route) => {
    const url = route.request().url();
    if (url.includes('filters=ACCESSIBLE')) {
      await route.fulfill({ json: parkListResponse });
    } else {
      await route.fulfill({ json: { items: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } } });
    }
  });

  await page.route('**/api/parks/park-acc-1/details', async (route) => {
    await route.fulfill({ json: parkDetails1 });
  });

  await page.route('**/api/parks/park-acc-2/details', async (route) => {
    await route.fulfill({ json: parkDetails2 });
  });
});

test('US#9 — página de lugares acessíveis carrega dados do backend', async ({ page }) => {
  await page.goto('/accessibility');
  await expect(page.getByRole('heading', { name: 'Lugares Acessíveis' })).toBeVisible();
  // Should show spots from both parks
  await expect(page.getByText('Zona A — Lugar 1')).toBeVisible();
  await expect(page.getByText('Entrada — PMR-01')).toBeVisible();
});

test('US#9 — mostra estatísticas corretas de acessibilidade', async ({ page }) => {
  await page.goto('/accessibility');
  await expect(page.getByRole('heading', { name: 'Lugares Acessíveis' })).toBeVisible();
  // 3 available (2 + 1), 2 parks, 5 total spots
  await expect(page.getByText('3').first()).toBeVisible();
  await expect(page.getByText('Parques com Acessibilidade').first()).toBeVisible();
  await expect(page.getByText('2').nth(1)).toBeVisible();
  await expect(page.getByText('5 Lugares Encontrados')).toBeVisible();
});

test('US#9 — badge de disponibilidade correto por lugar', async ({ page }) => {
  await page.goto('/accessibility');
  await expect(page.getByRole('heading', { name: 'Lugares Acessíveis' })).toBeVisible();
  // Available spots show "Disponível", occupied show "Ocupado"
  const disponivel = page.getByText('Disponível');
  const ocupado = page.getByText('Ocupado');
  await expect(disponivel.first()).toBeVisible();
  await expect(ocupado.first()).toBeVisible();
});

test('US#9 — filtro "apenas disponíveis" oculta lugares ocupados', async ({ page }) => {
  await page.goto('/accessibility');
  await expect(page.getByRole('heading', { name: 'Lugares Acessíveis' })).toBeVisible();

  // Enable filter
  await page.getByLabel('Apenas disponíveis').or(page.locator('.toggle-success')).click();

  // Occupied spots (false availability) should be hidden
  await expect(page.getByText('Zona B — Lugar 1')).not.toBeVisible();
  await expect(page.getByText('Entrada — PMR-02')).not.toBeVisible();

  // Available spots should still be visible
  await expect(page.getByText('Zona A — Lugar 1')).toBeVisible();
});

test('US#9 — botão reservar lugar leva à página de reserva com parkId correto', async ({ page }) => {
  await page.route('**/api/parks/cities', async (route) => { await route.fulfill({ json: ['Coimbra'] }); });
  await page.goto('/accessibility');
  await expect(page.getByRole('heading', { name: 'Lugares Acessíveis' })).toBeVisible();

  const reservarButtons = page.getByRole('button', { name: /Reservar Lugar/i });
  await reservarButtons.first().click();

  await expect(page).toHaveURL(/\/reservation\?parkId=/);
});

test('US#9 — botão "Ver Parque" navega para detalhe do parque', async ({ page }) => {
  await page.route('**/api/parks/park-acc-1/occupancy/hourly', async (route) => {
    await route.fulfill({ json: [] });
  });
  await page.route('**/api/parks/park-acc-1/favorite', async (route) => {
    await route.fulfill({ json: { parkId: 'park-acc-1', isFavorite: false } });
  });
  await page.goto('/accessibility');
  await expect(page.getByRole('heading', { name: 'Lugares Acessíveis' })).toBeVisible();

  const verParqueButtons = page.getByRole('button', { name: /Ver Parque/i });
  await verParqueButtons.first().click();

  await expect(page).toHaveURL(/\/parking\/park-acc-/);
});

test('US#9 — estado de erro mostra mensagem e botão de retry', async ({ page }) => {
  await page.unroute('**/api/parks/list**');
  await page.route('**/api/parks/list**', async (route) => {
    await route.fulfill({ status: 500, body: 'Internal Server Error' });
  });

  await page.goto('/accessibility');
  await expect(page.getByText(/Não foi possível carregar/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Tentar novamente/i })).toBeVisible();
});

test('US#9 — estado de loading é mostrado enquanto dados carregam', async ({ page }) => {
  let resolveList!: (value: unknown) => void;
  const listPending = new Promise((res) => { resolveList = res; });

  await page.unroute('**/api/parks/list**');
  await page.route('**/api/parks/list**', async (route) => {
    await listPending;
    await route.fulfill({ json: parkListResponse });
  });

  await page.goto('/accessibility');
  // Loading spinner should be visible initially
  await expect(page.getByRole('status').filter({ has: page.getByText('A carregar dados...') })).toBeVisible();

  resolveList(undefined);
  await expect(page.getByRole('heading', { name: 'Lugares Acessíveis' })).toBeVisible();
  await expect(page.getByRole('status').filter({ has: page.getByText('A carregar dados...') })).not.toBeVisible();
});
