import { test, expect } from '@playwright/test';

const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1MSIsIm5hbWUiOiJBbmEiLCJlbWFpbCI6ImFuYUBlYXN5c3BvdC5wdCIsImdyb3VwcyI6WyJEUklWRVIiXX0.sig';

const park = {
  id: 'park-1', name: 'Parque Central', city: 'Coimbra', address: 'Rua A, Coimbra', latitude: 40.2, longitude: -8.4,
  openingHours: '24h', pricePerHour: 1.5, totalSpaces: 50, freeSpaces: 10,
  evChargers: { available: 1, total: 1 }, accessibleSpaces: { available: 1, total: 1 },
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((token) => {
    sessionStorage.setItem('es_access_token', token);
    sessionStorage.setItem('es_id_token', token);
  }, jwt);

  await page.route('**/api/vehicles', async (route) => {
    await route.fulfill({ json: [{ id: 'v1', plate: 'AA-11-BB', isEv: true, isAccessible: false, isPrimary: true }] });
  });

  await page.route('**/api/parks/cities', async (route) => { await route.fulfill({ json: ['Coimbra'] }); });
  await page.route('**/api/parks/list**', async (route) => {
    await route.fulfill({ json: { items: [park], pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 } } });
  });
  await page.route('**/api/parks/park-1/details', async (route) => {
    await route.fulfill({ json: {
      id: 'park-1', name: 'Parque Central', address: 'Rua A, Coimbra', coordinates: { lat: 40.2, lng: -8.4 },
      openingHours: '24h', totalSpaces: 50, freeSpaces: 10, zones: [],
      spotMap: [{ spotNumber: 'f1:1', zone: 'STANDARD', row: 1, col: 1, status: 'free' }],
      evChargers: [{ type: 'Type 2', speed: '22kW', pricePerKwh: 0.3, availability: true }],
      accessibility: [{ location: 'A', availability: true, distanceToEntranceMeters: 12, baySize: '3.5m x 5.0m' }],
      tariffs: [{ pricePerHour: 1.5, maxDaily: 12, monthly: 60 }], amenities: ['wc'],
    } });
  });
  await page.route('**/api/parks/park-1/favorite', async (route) => {
    if (route.request().method() === 'POST') await route.fulfill({ json: { parkId: 'park-1', isFavorite: true } });
    else await route.fulfill({ json: { parkId: 'park-1', isFavorite: true } });
  });

  await page.route('**/api/profile', async (route) => {
    await route.fulfill({ json: {
      role: 'DRIVER', name: 'Ana Silva', email: 'ana@easyspot.pt', photoUrl: null,
      notificationsEnabled: true, driverType: 'ev', pushNotificationsEnabled: true,
      emailNotificationsEnabled: true, spending: { totalEuros: 0, sessionCount: 0, avgEuros: 0 }, favoritesCount: 1,
    } });
  });
});

test('Lista de parques', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Estacionamento' })).toBeVisible();
  await expect(page.getByText('1 parque encontrado')).toBeVisible();
});

test('Detalhe de parque', async ({ page }) => {
  await page.goto('/parking/park-1');
  await expect(page.getByRole('heading', { name: 'Parque Central' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Reservar/i })).toBeVisible();
});

test('Mapa do driver', async ({ page }) => {
  await page.goto('/map');
  await expect(page.getByLabel('Pesquisar parque')).toBeVisible();
  await expect(page.getByText('1')).toBeVisible();
});

test('Favoritos', async ({ page }) => {
  await page.goto('/favorites');
  await expect(page.getByRole('heading', { name: 'Favoritos' })).toBeVisible();
  await expect(page.getByText('Parque Central').first()).toBeVisible();
});

test('Perfil', async ({ page }) => {
  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'Perfil' })).toBeVisible();
  await expect(page.getByText('Ana Silva')).toBeVisible();
});
