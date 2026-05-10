import { test, expect } from '@playwright/test';

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

    // Step 1: avançar
    const nextBtn = page.locator('button:has-text("Escolher Lugar")');
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();

    // Step 2: selecionar lugar EV (B1)
    const evSpot = page.getByRole('button', { name: /Lugar B1/i });
    await expect(evSpot).toBeVisible();
    await evSpot.click();

    // Após selecionar spot EV, CostSummary deve mostrar carregamento
    await expect(page.getByText(/Carregamento EV/i)).toBeVisible();
    await expect(page.getByText(/Estacionamento/i)).toBeVisible();
    await expect(page.getByText(/Total estimado/i)).toBeVisible();

    // Valores numéricos presentes (€ prefix)
    await expect(page.getByText(/€0\.35\/kWh/i)).toBeVisible();
  });

  test('lugar padrão — reserva não mostra taxa de carregamento', async ({ page }) => {
    await page.goto('/reservation?parkId=park-std');

    const nextBtn = page.locator('button:has-text("Escolher Lugar")');
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();

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
    // Charger info — tipo e preço devem aparecer
    await expect(page.getByText(/Type 2/i)).toBeVisible();
    await expect(page.getByText(/0\.35/)).toBeVisible();
  });
});
