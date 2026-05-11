import { test, expect, type Page } from '@playwright/test';

async function waitForLoaded(page: Page) {
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {});
}

const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSIsIm5hbWUiOiJBbmEiLCJlbWFpbCI6ImFuYUBlYXN5c3BvdC5wdCIsImdyb3VwcyI6WyJEUklWRVIiXSwiaXNzIjoiaHR0cDovL2xvY2FsaG9zdC9hdXRoZW50aWsvYXBwbGljYXRpb24vby9lYXN5c3BvdC8iLCJleHAiOjk5OTk5OTk5OTl9.fake-sig';

const park = {
  id: 'park-1', name: 'Parque Central', city: 'Coimbra', address: 'Rua A, Coimbra', latitude: 40.2, longitude: -8.4,
  openingHours: '24h', pricePerHour: 1.5, totalSpaces: 50, freeSpaces: 10,
  evChargers: { available: 1, total: 2 }, accessibleSpaces: { available: 1, total: 2 },
};

const parkDetails = {
  id: 'park-1', name: 'Parque Central', address: 'Rua A, Coimbra', coordinates: { lat: 40.2, lng: -8.4 },
  openingHours: '24h', totalSpaces: 50, freeSpaces: 10, zones: [],
  spotMap: [
    { spotId: 'spot-uuid-free-1', spotNumber: 'f1:A1', zone: 'STANDARD', row: 1, col: 1, status: 'free' },
    { spotId: 'spot-uuid-reserved-1', spotNumber: 'f1:A2', zone: 'STANDARD', row: 1, col: 2, status: 'reserved' },
    { spotId: 'spot-uuid-occupied-1', spotNumber: 'f1:A3', zone: 'STANDARD', row: 1, col: 3, status: 'occupied' },
  ],
  evChargers: [
    { type: 'Type 2', speed: 'Rápida (22kW)', speedKw: 22, pricePerKwh: 0.30, availability: true },
    { type: 'CCS', speed: 'Ultra-rápida (50kW)', speedKw: 50, pricePerKwh: 0.45, availability: false },
  ],
  accessibility: [
    { location: 'Zona A - Piso 0', availability: true, distanceToEntranceMeters: 12, baySize: '4.0m x 5.0m', monitored: true, hasRampSpace: true, sensorStatus: 'online', ledStatus: 'green' },
    { location: 'Zona B - Piso -1', availability: false, distanceToEntranceMeters: 38, baySize: '3.5m x 5.0m', monitored: false, hasRampSpace: false, sensorStatus: 'faulty', ledStatus: 'yellow' },
  ],
  tariffs: [{ pricePerHour: 1.5, maxDaily: 12, monthly: 60 }], amenities: ['wc'],
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((token) => {
    sessionStorage.setItem('es_access_token', token);
    sessionStorage.setItem('es_id_token', token);
    localStorage.setItem('easyspot_vehicles', JSON.stringify([
      { id: 'v1', plate: 'AA-11-BB', isEV: true, isAccessible: false, isPrimary: true, chargerTypes: ['Type 2', 'CCS'] },
    ]));
  }, jwt);

  await page.route('**/api/vehicles', async (route) => {
    await route.fulfill({ json: [{ id: 'v1', plate: 'AA-11-BB', isEv: false, isAccessible: false, isPrimary: true }] });
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

  await page.route('**/api/payments/setup-status', async (route) => {
    await route.fulfill({ json: { configured: true } });
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
  await expect(page.getByText('1', { exact: true }).first()).toBeVisible();
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

// ── Infrastructure Mapping & Status Monitoring (US #13) ───────────────────

test('Tab EV - mostra carregadores com disponibilidade e preço', async ({ page }) => {
  await page.goto('/parking/park-1');
  await waitForLoaded(page);
  await page.getByRole('button', { name: /EV/i }).click();
  await expect(page.getByText('Type 2', { exact: true })).toBeVisible();
  await expect(page.getByText('CCS', { exact: true })).toBeVisible();
  await expect(page.getByText(/€0\.30/)).toBeVisible();
  await expect(page.getByText(/€0\.45/)).toBeVisible();
  await expect(page.getByText('Livre').first()).toBeVisible();
  await expect(page.getByText('Ocupado').first()).toBeVisible();
});

test('Tab EV - mostra velocidade correta dos carregadores', async ({ page }) => {
  await page.goto('/parking/park-1');
  await waitForLoaded(page);
  await page.getByRole('button', { name: /EV/i }).click();
  await expect(page.getByText(/22\s*kW/)).toBeVisible();
  await expect(page.getByText(/50\s*kW/)).toBeVisible();
});

test('Tab EV - compatibilidade com veículo EV do utilizador', async ({ page }) => {
  await page.goto('/parking/park-1');
  await waitForLoaded(page);
  await page.getByRole('button', { name: /EV/i }).click();
  await expect(page.getByText(/Compatibilidade/i)).toBeVisible();
});

test('Tab Acessibilidade - mostra lugares com distância e dimensão', async ({ page }) => {
  await page.goto('/parking/park-1');
  await waitForLoaded(page);
  await page.getByRole('button', { name: /Acess/i }).click();
  await expect(page.getByText('Zona A - Piso 0')).toBeVisible();
  await expect(page.getByText('Zona B - Piso -1')).toBeVisible();
  await expect(page.getByText('12m')).toBeVisible();
  await expect(page.getByText('38m')).toBeVisible();
});

test('Tab Acessibilidade - mostra estado do sensor online e avariado', async ({ page }) => {
  await page.goto('/parking/park-1');
  await waitForLoaded(page);
  await page.getByRole('button', { name: /Acess/i }).click();
  await expect(page.getByText('Sensor online')).toBeVisible();
  await expect(page.getByText('Sensor avariado')).toBeVisible();
});

test('Tab Acessibilidade - mostra disponibilidade correta dos lugares', async ({ page }) => {
  await page.goto('/parking/park-1');
  await waitForLoaded(page);
  await page.getByRole('button', { name: /Acess/i }).click();
  const badges = page.getByText(/^(Livre|Ocupado)$/);
  await expect(badges.first()).toBeVisible();
});

test('Tab Acessibilidade - mostra legenda de distância e dimensão', async ({ page }) => {
  await page.goto('/parking/park-1');
  await waitForLoaded(page);
  await page.getByRole('button', { name: /Acess/i }).click();
  await expect(page.getByText(/DISTÂNCIA À ENTRADA/i)).toBeVisible();
  await expect(page.getByText(/DIMENSÃO DO LUGAR/i)).toBeVisible();
});

test('Tab Acessibilidade - link de reporte de ocupação irregular', async ({ page }) => {
  await page.goto('/parking/park-1');
  await waitForLoaded(page);
  await page.getByRole('button', { name: /Acess/i }).click();
  await expect(page.getByRole('link', { name: /Reportar/i })).toBeVisible();
});

test('Infraestrutura - contador EV e Acessível no header do parque', async ({ page }) => {
  await page.goto('/parking/park-1');
  await expect(page.getByText(/1\/2\s*EV/)).toBeVisible();
  await expect(page.getByText(/1\s*Acess\./)).toBeVisible();
});

// ── US#2 Price Transparency & Planning E2E tests ────────────────────────────

test('Tarifas do parque — mostra taxa horária do backend', async ({ page }) => {
  await page.goto('/parking/park-1');
  await expect(page.getByRole('heading', { name: 'Parque Central' })).toBeVisible();
  await page.getByRole('button', { name: /Tarifas/i }).click();
  await expect(page.getByText('Por Hora').first()).toBeVisible();
  await expect(page.getByText('€1.50').first()).toBeVisible();
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
  await expect(page.getByText(/Previsão de ocupação/).first()).toBeVisible();
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
    await page.goto('/reservation?parkId=park-1');
    await waitForLoaded(page);
    await expect(page.getByRole('heading', { name: 'Reservar Lugar' })).toBeVisible();

    await page.getByRole('button', { name: /Avançar para escolha do lugar/i }).click();

    await expect(page.getByRole('button', { name: 'Lugar A1' })).toBeVisible();

    const reservedSpot = page.getByRole('button', { name: 'Lugar A2' });
    const occupiedSpot = page.getByRole('button', { name: 'Lugar A3' });
    await expect(reservedSpot).toBeDisabled();
    await expect(occupiedSpot).toBeDisabled();
  });

  test('Lugar livre pode ser selecionado e reservado com sucesso', async ({ page }) => {
    await page.goto('/reservation?parkId=park-1');
    await waitForLoaded(page);
    await expect(page.getByRole('heading', { name: 'Reservar Lugar' })).toBeVisible();

    await page.getByRole('button', { name: /Avançar para escolha do lugar/i }).click();

    await expect(page.getByRole('button', { name: 'Lugar A1' })).toBeVisible();
    await page.getByRole('button', { name: 'Lugar A1' }).click();
    await expect(page.getByText('Lugar A1 selecionado')).toBeVisible();
    await page.getByRole('button', { name: 'Confirmar Lugar' }).click();

    await page.getByRole('checkbox').click();
    await page.getByRole('button', { name: /Confirmar e reservar lugar/i }).click();

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

    await page.goto('/reservation?parkId=park-1');
    await waitForLoaded(page);
    await page.getByRole('button', { name: /Avançar para escolha do lugar/i }).click();
    await expect(page.getByRole('button', { name: 'Lugar A1' })).toBeVisible();
    await page.getByRole('button', { name: 'Lugar A1' }).click();
    await page.getByRole('button', { name: 'Confirmar Lugar' }).click();
    await page.getByRole('checkbox').click();
    await page.getByRole('button', { name: /Confirmar e reservar lugar/i }).click();

    await expect(page.locator('.alert-error')).toContainText(/not available|indisponível|conflito/i);
  });
});
