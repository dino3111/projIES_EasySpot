import { test, expect } from '@playwright/test';

const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1MSIsIm5hbWUiOiJBbmEiLCJlbWFpbCI6ImFuYUBlYXN5c3BvdC5wdCIsImdyb3VwcyI6WyJEUklWRVIiXX0.sig';

const park = {
  id: 'park-1', name: 'Parque Central', city: 'Coimbra', address: 'Rua A, Coimbra', latitude: 40.2, longitude: -8.4,
  openingHours: '24h', pricePerHour: 1.5, totalSpaces: 50, freeSpaces: 10,
  evChargers: { available: 1, total: 1 }, accessibleSpaces: { available: 1, total: 1 },
};

const parkDetails = {
  id: 'park-1', name: 'Parque Central', address: 'Rua A, Coimbra', coordinates: { lat: 40.2, lng: -8.4 },
  openingHours: '24h', totalSpaces: 50, freeSpaces: 10, zones: [],
  spotMap: [
    { spotId: 'spot-uuid-free-1', spotNumber: 'f1:A1', zone: 'STANDARD', row: 1, col: 1, status: 'free' },
    { spotId: 'spot-uuid-reserved-1', spotNumber: 'f1:A2', zone: 'STANDARD', row: 1, col: 2, status: 'reserved' },
    { spotId: 'spot-uuid-occupied-1', spotNumber: 'f1:A3', zone: 'STANDARD', row: 1, col: 3, status: 'occupied' },
  ],
  evChargers: [{ type: 'Type 2', speed: '22kW', pricePerKwh: 0.3, availability: true }],
  accessibility: [{ location: 'A', availability: true, distanceToEntranceMeters: 12, baySize: '3.5m x 5.0m' }],
  tariffs: [{ pricePerHour: 1.5, maxDaily: 12, monthly: 60 }], amenities: ['wc'],
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
    await route.fulfill({ json: parkDetails });
  });
  await page.route('**/api/parks/park-1/occupancy/hourly', async (route) => {
    await route.fulfill({ json: [
      { hour: '08h', occupancyPercent: 35 },
      { hour: '09h', occupancyPercent: 65 },
      { hour: '10h', occupancyPercent: 82 },
      { hour: '11h', occupancyPercent: 90 },
      { hour: '12h', occupancyPercent: 88 },
      { hour: '13h', occupancyPercent: 80 },
      { hour: '14h', occupancyPercent: 75 },
      { hour: '15h', occupancyPercent: 85 },
    ] });
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

// ── US#2 Price Transparency & Planning E2E tests ────────────────────────────

test('Tarifas do parque — mostra taxa horária do backend', async ({ page }) => {
  await page.goto('/parking/park-1');
  await expect(page.getByRole('heading', { name: 'Parque Central' })).toBeVisible();
  await page.getByRole('button', { name: /Tarifas/i }).click();
  await expect(page.getByText('Por Hora')).toBeVisible();
  await expect(page.getByText('€1.50')).toBeVisible();
});

test('Tarifas do parque — mostra gráfico de ocupação histórica', async ({ page }) => {
  await page.goto('/parking/park-1');
  await page.getByRole('button', { name: /Tarifas/i }).click();
  await expect(page.getByText('Tendência de ocupação')).toBeVisible();
});

test('Planeamento — condutor vê recomendações com preços', async ({ page }) => {
  await page.route('**/api/driver/costs/planning**', async (route) => {
    await route.fulfill({ json: { recommendations: [{
      id: 'park-1', name: 'Parque Central', address: 'Rua A, Coimbra',
      openingHours: '24h', distanceMeters: 500, pricePerHour: 1.5,
      currentOccupancy: { occupied: 30, total: 50, occupancyPercent: 60, status: 'AVAILABLE' },
      occupancyByHour: [
        { hour: '08h', occupancyPercent: 35 },
        { hour: '10h', occupancyPercent: 82 },
      ],
    }] } });
  });
  await page.goto('/costs?tab=planeamento');
  await expect(page.getByText('Parque Central')).toBeVisible();
  await expect(page.getByText(/€1\.50/)).toBeVisible();
});

test('Planeamento — condutor expande previsão de ocupação', async ({ page }) => {
  await page.route('**/api/driver/costs/planning**', async (route) => {
    await route.fulfill({ json: { recommendations: [{
      id: 'park-1', name: 'Parque Central', address: 'Rua A, Coimbra',
      openingHours: '24h', distanceMeters: 500, pricePerHour: 1.5,
      currentOccupancy: { occupied: 30, total: 50, occupancyPercent: 60, status: 'AVAILABLE' },
      occupancyByHour: [
        { hour: '08h', occupancyPercent: 35 },
        { hour: '10h', occupancyPercent: 82 },
      ],
    }] } });
  });
  await page.goto('/costs?tab=planeamento');
  await page.getByRole('button', { name: /Ver previsão/i }).click();
  await expect(page.getByText('Previsão de ocupação')).toBeVisible();
});

// ── Reservation E2E tests ────────────────────────────────────────────────────

test.describe('Reserva de lugar', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/reservations', async (route) => {
      if (route.request().method() !== 'POST') { await route.continue(); return; }
      await route.fulfill({
        status: 201,
        json: {
          reservationId: 'res-1', bookingCode: 'ES-ABCD-EFGH',
          parkId: 'park-1', parkName: 'Parque Central', parkAddress: 'Rua A, Coimbra',
          spotId: 'spot-uuid-free-1', spotNumber: 'A1',
          vehicleId: 'v1', arrivalDateTime: new Date(Date.now() + 2 * 3600_000).toISOString(),
          departureDateTime: new Date(Date.now() + 4 * 3600_000).toISOString(),
          status: 'CONFIRMED', lockedUntil: new Date(Date.now() + 30 * 60_000).toISOString(),
          estimatedCost: 3.0,
        },
      });
    });
  });

  test('Lugares reservados/ocupados não são selecionáveis', async ({ page }) => {
    await page.goto('/reservar?parkId=park-1');
    await expect(page.getByRole('heading', { name: 'Reservar Lugar' })).toBeVisible();

    // Avança para step 2 — selecionar parque já está pré-definido pelo parkId
    await page.getByRole('button', { name: /Seguinte|Próximo|Continuar/i }).first().click();

    // Spots ocupados/reservados devem estar desabilitados
    const reservedSpot = page.getByRole('button', { name: 'Lugar A2' });
    const occupiedSpot = page.getByRole('button', { name: 'Lugar A3' });
    await expect(reservedSpot).toBeDisabled();
    await expect(occupiedSpot).toBeDisabled();
  });

  test('Lugar livre pode ser selecionado e reservado com sucesso', async ({ page }) => {
    await page.goto('/reservar?parkId=park-1');
    await expect(page.getByRole('heading', { name: 'Reservar Lugar' })).toBeVisible();

    // Step 1: avança (parque já pré-selecionado via parkId)
    await page.getByRole('button', { name: /Seguinte|Próximo|Continuar/i }).first().click();

    // Step 2: selecionar lugar livre A1
    await page.getByRole('button', { name: 'Lugar A1' }).click();
    await expect(page.getByText('A1 selecionado')).toBeVisible();
    await page.getByRole('button', { name: 'Confirmar Lugar' }).click();

    // Step 3: aceitar termos e confirmar
    await page.getByRole('checkbox').click();
    await page.getByRole('button', { name: /Confirmar Reserva/i }).click();

    // Step 4: confirmação
    await expect(page.getByText('ES-ABCD-EFGH')).toBeVisible();
  });

  test('Erro de spot já reservado é apresentado ao utilizador', async ({ page }) => {
    await page.unroute('**/api/reservations');
    await page.route('**/api/reservations', async (route) => {
      await route.fulfill({
        status: 409,
        json: { detail: 'Spot A2 is not available' },
      });
    });

    await page.goto('/reservar?parkId=park-1');
    await page.getByRole('button', { name: /Seguinte|Próximo|Continuar/i }).first().click();
    await page.getByRole('button', { name: 'Lugar A1' }).click();
    await page.getByRole('button', { name: 'Confirmar Lugar' }).click();
    await page.getByRole('checkbox').click();
    await page.getByRole('button', { name: /Confirmar Reserva/i }).click();

    await expect(page.getByRole('alert')).toContainText(/not available|indisponível|conflito/i);
  });
});
