import { test, expect, type Page } from '@playwright/test';

async function waitForLoaded(page: Page) {
  await page.waitForSelector('[role="status"][aria-busy="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {});
}

async function fillValidReservationSchedule(page: Page) {
  const toLocalInput = (date: Date) => {
    const pad = (value: number) => String(value).padStart(2, '0');
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate()),
    ].join('-') + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const arrival = toLocalInput(new Date(Date.now() + 60 * 60 * 1000));
  const exit = toLocalInput(new Date(Date.now() + 2 * 60 * 60 * 1000));
  await page.getByLabel('Data e hora de chegada').fill(arrival);
  await page.getByLabel('Hora de saída prevista').fill(exit);
}

const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSIsIm5hbWUiOiJBbmEiLCJlbWFpbCI6ImFuYUBlYXN5c3BvdC5wdCIsImdyb3VwcyI6WyJEUklWRVIiXSwiaXNzIjoiaHR0cDovL2xvY2FsaG9zdC9hdXRoZW50aWsvYXBwbGljYXRpb24vby9lYXN5c3BvdC8iLCJleHAiOjk5OTk5OTk5OTl9.fake-sig';

const parkWithEV = {
  id: 'park-ev', name: 'Parque EV', address: 'Rua EV, Aveiro',
  coordinates: { lat: 40.64, lng: -8.65 },
  openingHours: '24h', totalSpaces: 50, freeSpaces: 15,
  zones: [
    { zoneName: 'STANDARD', total: 40, free: 12 },
    { zoneName: 'EV', total: 10, free: 3 },
  ],
  spotMap: [
    { spotId: 'spot-std-1', spotNumber: 'f0:A1', zone: 'STANDARD', row: 1, col: 1, status: 'free' },
    { spotId: 'spot-ev-1',  spotNumber: 'f0:B1', zone: 'EV',       row: 2, col: 1, status: 'ev'   },
  ],
  evChargers: [
    { type: 'Type 2', speed: 'Rápida (22kW)', pricePerKwh: 0.35, availability: true },
  ],
  accessibility: [],
  tariffs: [{ name: 'Standard', description: '', pricePerHour: 1.5, maxDaily: 12.0, monthly: 90.0, pricePerKwh: null }],
  amenities: [],
};

const parkWithoutEV = {
  id: 'park-std', name: 'Parque Padrão', address: 'Rua Normal, Aveiro',
  coordinates: { lat: 40.64, lng: -8.65 },
  openingHours: '24h', totalSpaces: 30, freeSpaces: 10,
  zones: [{ zoneName: 'STANDARD', total: 30, free: 10 }],
  spotMap: [
    { spotId: 'spot-std-2', spotNumber: 'f0:A1', zone: 'STANDARD', row: 1, col: 1, status: 'free' },
  ],
  evChargers: [],
  accessibility: [],
  tariffs: [{ name: 'Standard', description: '', pricePerHour: 1.0, maxDaily: 8.0, monthly: 60.0, pricePerKwh: null }],
  amenities: [],
};

test.describe('US#7 — Combined Parking + Charging Fee', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((token) => {
      sessionStorage.setItem('es_access_token', token);
      sessionStorage.setItem('es_id_token', token);
    }, jwt);

    await page.route('**/api/profile', async (route) => {
      await route.fulfill({ json: { role: 'DRIVER', name: 'Ana Silva', email: 'ana@easyspot.pt' } });
    });
    await page.route('**/api/vehicles', async (route) => {
      await route.fulfill({ json: [{ id: 'v1', plate: 'AA-11-BB', isPrimary: true, isEv: true, isAccessible: false }] });
    });
    await page.route('**/api/payments/setup-status', async (route) => {
      await route.fulfill({ json: { configured: true } });
    });
    await page.route('**/api/parks/list**', async (route) => {
      await route.fulfill({ json: { items: [
        { id: 'park-ev', name: 'Parque EV', city: 'Aveiro', address: 'Rua EV, Aveiro', latitude: 40.64, longitude: -8.65, openingHours: '24h', pricePerHour: 1.5, totalSpaces: 50, freeSpaces: 15, evChargers: { available: 1, total: 1 }, accessibleSpaces: { available: 0, total: 0 }, availabilityStatus: 'AVAILABLE' },
        { id: 'park-std', name: 'Parque Padrão', city: 'Aveiro', address: 'Rua Normal, Aveiro', latitude: 40.64, longitude: -8.65, openingHours: '24h', pricePerHour: 1.0, totalSpaces: 30, freeSpaces: 10, evChargers: { available: 0, total: 0 }, accessibleSpaces: { available: 0, total: 0 }, availabilityStatus: 'AVAILABLE' },
      ], pagination: { page: 1, pageSize: 500, totalItems: 2, totalPages: 1 } } });
    });
    await page.route('**/api/parks/catalog/summary', async (route) => {
      await route.fulfill({ json: [parkWithEV, parkWithoutEV] });
    });
    await page.route('**/api/parks/park-ev/details', async (route) => {
      await route.fulfill({ json: parkWithEV });
    });
    await page.route('**/api/parks/catalog/details/park-ev', async (route) => {
      await route.fulfill({ json: parkWithEV });
    });
    await page.route('**/api/parks/park-ev/favorite', async (route) => {
      await route.fulfill({ json: { parkId: 'park-ev', isFavorite: false } });
    });
    await page.route('**/api/parks/park-std/details', async (route) => {
      await route.fulfill({ json: parkWithoutEV });
    });
    await page.route('**/api/parks/catalog/details/park-std', async (route) => {
      await route.fulfill({ json: parkWithoutEV });
    });
    await page.route('**/api/parks/park-std/favorite', async (route) => {
      await route.fulfill({ json: { parkId: 'park-std', isFavorite: false } });
    });
  });

  test('lugar EV — reserva mostra custo estacionamento + carregamento + total', async ({ page }) => {
    await page.goto('/reservation?parkId=park-ev');
    await waitForLoaded(page);
    await fillValidReservationSchedule(page);

    // Step 1: avançar
    const nextBtn = page.getByRole('button', { name: /Avançar para escolha do lugar/i });
    await expect(nextBtn).toBeVisible();
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();

    // Step 2: selecionar lugar EV (B1)
    const evSpot = page.getByRole('button', { name: /Lugar B1/i });
    await expect(evSpot).toBeVisible();
    await evSpot.click();

    // Após selecionar spot EV, CostSummary deve mostrar carregamento
    await expect(page.getByText(/Carregamento EV/i).first()).toBeVisible();
    await expect(page.getByText(/Estacionamento/i).first()).toBeVisible();
    await expect(page.getByText(/Total estimado/i)).toBeVisible();

    // Valores numéricos presentes (€ prefix)
    await expect(page.getByText(/€0\.35\/kWh/i)).toBeVisible();
  });

  test('lugar padrão — reserva não mostra taxa de carregamento', async ({ page }) => {
    await page.goto('/reservation?parkId=park-std');
    await waitForLoaded(page);
    await fillValidReservationSchedule(page);

    const nextBtn = page.getByRole('button', { name: /Avançar para escolha do lugar/i });
    await expect(nextBtn).toBeVisible();
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();

    // O perfil ativo é EV; o teste quer validar um lugar standard, por isso
    // mudamos o filtro para mostrar todos os lugares.
    await page.getByRole('button', { name: /Todos/i }).click();

    // Selecionar lugar standard (A1)
    const stdSpot = page.getByRole('button', { name: /Lugar A1/i });
    await expect(stdSpot).toBeVisible();
    await stdSpot.click();

    // Não deve aparecer linha de carregamento
    await expect(page.getByText(/Carregamento EV/i)).not.toBeVisible();
    await expect(page.getByText(/Total estimado/i)).toBeVisible();
  });

  test('página de detalhes do parque EV mostra carregadores com preço', async ({ page }) => {
    await page.goto('/parking/park-ev');

    await expect(page.getByText(/Parque EV/i)).toBeVisible();
    // Navegar para o separador de carregamento EV
    await page.getByRole('button', { name: /EV/i }).click();
    // Charger info — tipo e preço devem aparecer
    await expect(page.getByText('Type 2', { exact: true })).toBeVisible();
    await expect(page.getByText(/0\.35/)).toBeVisible();
  });
});
