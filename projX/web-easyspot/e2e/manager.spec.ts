import { test, expect } from '@playwright/test';

const managerJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtZ3ItMSIsIm5hbWUiOiJBbnTDs25pbyBWaWRlaXJhIiwiZW1haWwiOiJhbnRvbmlvQGVhc3lzcG90LnB0IiwiZ3JvdXBzIjpbIk1BTkFHRVIiXX0.sig';

const mockDashboard = {
  kpis: {
    todayEntrances: 303,
    entranceVariance: 14.4,
    averageOccupancy: 69,
    totalLots: 1143,
    occupiedLots: 769,
    totalEarnings: 1745.6,
    earningsVariance: 26.4,
    averageOccupancyTime: '2h 14m',
    alertsOpened: 3,
    activeParks: 9,
  },
  seriesLast7Days: [
    { date: '2026-03-03', day: 'Ter', entrances: 312, earnings: 1840.5 },
    { date: '2026-03-09', day: 'Seg', entrances: 303, earnings: 1745.6 },
  ],
  occupancyPerZone: [
    { name: 'Normal', type: 'standard', total: 680, occupied: 510 },
    { name: 'Carregamento EV', type: 'ev', total: 80, occupied: 52 },
    { name: 'Mobilidade Reduzida', type: 'accessible', total: 40, occupied: 18 },
    { name: 'Reservados', type: 'reserved', total: 60, occupied: 48 },
  ],
  occupancyPerHour: [
    { time: '08h', occupancy: 42 },
    { time: '09h', occupancy: 68 },
    { time: '12h', occupancy: 85 },
  ],
  lastAlerts: [
    {
      id: 'iss-001',
      type: 'sensor',
      park: 'Fórum Aveiro',
      zone: 'Piso 0 – Zona B',
      sensorId: 'IR-AV1-B07',
      plate: null,
      description: 'Sensor infravermelho sem leituras.',
      severity: 'critica',
      state: 'aberto',
      createdAt: '2026-03-09T08:14:00Z',
      attributedTo: null,
      notes: null,
    },
  ],
  performancePerPark: [
    { name: 'Fórum Aveiro', city: 'Aveiro', entrances: 58, occupancyPercentage: 74, earnings: 342.5 },
    { name: 'Glicínias Plaza', city: 'Aveiro', entrances: 42, occupancyPercentage: 61, earnings: 198.2 },
  ],
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((token) => {
    sessionStorage.setItem('es_access_token', token);
    sessionStorage.setItem('es_id_token', token);
  }, managerJwt);

  await page.route('**/api/manager/dashboard', async (route) => {
    await route.fulfill({ json: mockDashboard });
  });

  await page.route('**/api/profile', async (route) => {
    await route.fulfill({
      json: {
        role: 'MANAGER',
        name: 'António Videira',
        email: 'antonio@easyspot.pt',
        photoUrl: null,
        notificationsEnabled: true,
        managedParks: 9,
        todayRevenue: 1745.6,
        todayVehicles: 303,
        openAlerts: 3,
      },
    });
  });
});

test('Manager dashboard loads KPI cards', async ({ page }) => {
  await page.goto('/manager/dashboard');
  await expect(page.getByText('Painel de Desempenho')).toBeVisible();
  await expect(page.getByText('Entradas Hoje')).toBeVisible();
  await expect(page.getByText('303')).toBeVisible();
  await expect(page.getByText('Taxa de Ocupação')).toBeVisible();
  await expect(page.getByText('69%')).toBeVisible();
  await expect(page.getByText('Receita Hoje')).toBeVisible();
  await expect(page.getByText('€1745.60')).toBeVisible();
});

test('Manager dashboard shows park performance table', async ({ page }) => {
  await page.goto('/manager/dashboard');
  await expect(page.getByText('Desempenho por Parque — Hoje')).toBeVisible();
  await expect(page.getByText('Fórum Aveiro')).toBeVisible();
  await expect(page.getByText('€342.50')).toBeVisible();
  await expect(page.getByText('Glicínias Plaza')).toBeVisible();
});

test('Manager dashboard shows recent alerts', async ({ page }) => {
  await page.goto('/manager/dashboard');
  await expect(page.getByText('Alertas Recentes')).toBeVisible();
  await expect(page.getByText('1 em aberto')).toBeVisible();
  await expect(page.getByText('Sensor infravermelho sem leituras.')).toBeVisible();
});

test('Manager dashboard shows zone occupancy', async ({ page }) => {
  await page.goto('/manager/dashboard');
  await expect(page.getByText('Ocupação por Zona')).toBeVisible();
  await expect(page.getByText('Normal')).toBeVisible();
  await expect(page.getByText('510/680')).toBeVisible();
});

test('Manager dashboard shows chart section', async ({ page }) => {
  await page.goto('/manager/dashboard');
  await expect(page.getByText('Últimos 7 Dias')).toBeVisible();
  await expect(page.getByText('Ocupação por Hora — Hoje')).toBeVisible();
});
