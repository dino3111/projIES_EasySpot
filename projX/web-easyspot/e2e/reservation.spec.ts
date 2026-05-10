import { test, expect } from '@playwright/test';

const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSIsIm5hbWUiOiJBbmEiLCJlbWFpbCI6ImFuYUBlYXN5c3BvdC5wdCIsImdyb3VwcyI6WyJEUklWRVIiXSwiaXNzIjoiaHR0cDovL2xvY2FsaG9zdC9hdXRoZW50aWsvYXBwbGljYXRpb24vby9lYXN5c3BvdC8iLCJleHAiOjk5OTk5OTk5OTl9.fake-sig';

test.beforeEach(async ({ page }) => {
  await page.addInitScript((token) => {
    sessionStorage.setItem('es_access_token', token);
    sessionStorage.setItem('es_id_token', token);
  }, jwt);

  // Mocks basicos
  await page.route('**/api/profile', async (route) => {
    await route.fulfill({ json: { role: 'DRIVER', name: 'Ana Silva', email: 'ana@easyspot.pt' } });
  });

  await page.route('**/api/vehicles', async (route) => {
    await route.fulfill({ json: [{ id: 'v1', plate: 'AA-11-BB', isPrimary: true, isEv: false, isAccessible: false }] });
  });

  await page.route('**/api/payments/setup-status', async (route) => {
    await route.fulfill({ json: { configured: true } });
  });

  const parkDetails = {
    id: 'park-1', name: 'Parque Central', address: 'Rua Central, 1', 
    coordinates: { lat: 40.6405, lng: -8.6538 },
    openingHours: '24h', totalSpaces: 50, freeSpaces: 10,
    zones: [{ zoneName: 'STANDARD', total: 50, free: 10 }],
    spotMap: [{ spotNumber: 'A1', zone: 'STANDARD', row: 1, col: 1, status: 'free' }],
    evChargers: [], accessibility: [],
    tariffs: [{ pricePerHour: 1.5, maxDaily: 15, monthly: 100 }],
    amenities: ['wc'], hourlyRate: 1.5, is24h: true,
    floors: [{ id: 'f1', name: 'Piso 0', spots: [{ id: 's1', label: 'A1', row: 1, col: 1, status: 'free' }] }]
  };

  await page.route('**/api/parks/park-1/details', async (route) => {
    await route.fulfill({ json: parkDetails });
  });

  await page.route('**/api/parks/list**', async (route) => {
    await route.fulfill({ json: { items: [
      { id: 'park-1', name: 'Parque Central', city: 'Coimbra', address: 'Rua Central, 1', latitude: 40.6405, longitude: -8.6538, openingHours: '24h', pricePerHour: 1.5, totalSpaces: 50, freeSpaces: 10, evChargers: { available: 0, total: 0 }, accessibleSpaces: { available: 0, total: 0 }, availabilityStatus: 'AVAILABLE' },
    ], pagination: { page: 1, pageSize: 500, totalItems: 1, totalPages: 1 } } });
  });

  await page.route('**/api/parks/park-1/favorite', async (route) => {
    await route.fulfill({ json: { parkId: 'park-1', isFavorite: false } });
  });
});

test('Fluxo de reserva completa passo-a-passo', async ({ page }) => {
  // 1. Ir para os detalhes
  await page.goto('/parking/park-1');
  await expect(page.locator('h1').filter({ hasText: /Parque Central/i })).toBeVisible();
  
  // 2. Iniciar Reserva
  await page.getByRole('link', { name: /Reservar/i }).click();
  await expect(page).toHaveURL(/\/reservation\?parkId=park-1/);

  // STEP 1: Horário
  // Garantir que os inputs estão preenchidos (os defaults devem funcionar, mas forçamos para estabilidade)
  // O botão "Escolher Lugar" deve estar habilitado
  const nextBtn1 = page.locator('button:has-text("Escolher Lugar")');
  await expect(nextBtn1).toBeVisible();
  await nextBtn1.click();

  // STEP 2: Escolha de Lugar
  // O lugar A1 deve aparecer como um botão
  const spotA1 = page.getByRole('button', { name: /Lugar A1/i });
  await expect(spotA1).toBeVisible();
  await spotA1.click();
  
  const nextBtn2 = page.locator('button:has-text("Confirmar Lugar")');
  await expect(nextBtn2).toBeVisible();
  await nextBtn2.click();

  // STEP 3: Confirmação
  await expect(page.getByText(/Resumo da Reserva/i)).toBeVisible();
  
  // Aceitar termos
  await page.locator('input[type="checkbox"]').check();

  // Mock submissão final
  await page.route('**/api/reservations', async (route) => {
    await route.fulfill({ status: 201, json: {
      id: 'res-123',
      bookingCode: 'ABC-123',
      status: 'CONFIRMED',
      lockedUntil: new Date(Date.now() + 1800000).toISOString(),
    } });
  });

  // Confirmar Final
  const confirmBtn = page.locator('button:has-text("Confirmar Reserva")');
  await expect(confirmBtn).toBeEnabled();
  await confirmBtn.click();

  // STEP 4: Concluído
  await expect(page.getByText(/ES-/i).or(page.getByText(/ABC-123/i))).toBeVisible();
});
