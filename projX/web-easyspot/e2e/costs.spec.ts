import { test, expect } from '@playwright/test';

const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSIsIm5hbWUiOiJBbmEiLCJlbWFpbCI6ImFuYUBlYXN5c3BvdC5wdCIsImdyb3VwcyI6WyJEUklWRVIiXSwiaXNzIjoiaHR0cDovL2xvY2FsaG9zdC9hdXRoZW50aWsvYXBwbGljYXRpb24vby9lYXN5c3BvdC8iLCJleHAiOjk5OTk5OTk5OTl9.fake-sig';

test.describe('Costs and Planning', () => {
  test.beforeEach(async ({ page }) => {
    // Inject mock token
    await page.addInitScript((token) => {
      sessionStorage.setItem('es_access_token', token);
      sessionStorage.setItem('es_id_token', token);
    }, jwt);

    // Mock Vehicles
    await page.route('**/api/vehicles', async (route) => {
      await route.fulfill({ json: [{ id: 'v1', plate: 'AA-11-BB', isEv: true, isAccessible: false, isPrimary: true, model: 'Model 3' }] });
    });

    // Mock Payment status to avoid onboarding modal
    await page.route('**/api/payments/setup-status', async (route) => {
      await route.fulfill({ json: { configured: true } });
    });

    // Mock Spending
    await page.route('**/api/driver/costs/spending**', async (route) => {
      await route.fulfill({ json: {
        totals: { totalSpent: 100.50, avgPerSession: 10.05, parkingSpent: 80.00, chargingSpent: 20.50 },
        insights: { mostUsedPark: 'Parque Central', costliestSession: null, sessionCount: 10 },
        timeseries: [{ date: '2026-03-01', totalSpent: 10.50 }],
        breakdownByPark: [{ id: 'p1', name: 'Parque Central', totalSpent: 100.50 }],
        breakdownByVehicle: [{ id: 'v1', name: 'AA-11-BB', totalSpent: 100.50 }],
        history: [
          { parkName: 'Parque Central', date: '2026-03-01T10:00:00Z', durationMinutes: 60, vehicle: 'AA-11-BB', totalSpent: 10.50, status: 'COMPLETED' }
        ]
      } });
    });

    // Mock Cities
    await page.route('**/api/parks/cities', async (route) => {
      await route.fulfill({ json: ['Aveiro', 'Coimbra'] });
    });

    // Mock Planning
    await page.route('**/api/driver/costs/planning**', async (route) => {
      await route.fulfill({ json: {
        recommendations: [
          {
            id: 'p1', name: 'Parque Estádio', address: 'Rua do Estádio', openingHours: '24h',
            distanceMeters: 500, pricePerHour: 1.5,
            currentOccupancy: { occupied: 10, total: 100, occupancyPercent: 10, status: 'AVAILABLE' },
            occupancyByHour: []
          }
        ]
      } });
    });

    // Mock Profile
    await page.route('**/api/profile', async (route) => {
      await route.fulfill({ json: {
        role: 'DRIVER', name: 'Ana Silva', email: 'ana@easyspot.pt',
        vehicles: [{ id: 'v1', plate: 'AA-11-BB', isEv: true, isAccessible: false, isPrimary: true }]
      } });
    });

    await page.goto('/costs');
  });

  async function waitForLoading(page: any) {
    await page.locator('[role="status"]').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  test('should display spending statistics', async ({ page }) => {
    await waitForLoading(page);
    await expect(page.getByText('Os Meus Gastos')).toBeVisible();
    
    // Check for KPI cards
    await expect(page.getByText('Total gasto')).toBeVisible();
    await expect(page.getByText('Média/sessão')).toBeVisible();
    
    // Check for values from mock
    await expect(page.getByText('€100.50').first()).toBeVisible();
    await expect(page.getByText('Parque Central').first()).toBeVisible();
  });

  test('should allow switching periods', async ({ page }) => {
    await waitForLoading(page);
    const sevenDaysBtn = page.getByRole('button', { name: '7 dias' });
    await expect(sevenDaysBtn).toBeVisible();
    await sevenDaysBtn.click();
    await waitForLoading(page);
    await expect(sevenDaysBtn).toHaveClass(/bg-primary|text-primary-foreground/);
  });

  test('should navigate to planning and show recommendations', async ({ page }) => {
    await waitForLoading(page);
    const tab = page.getByRole('tab', { name: /Planeamento/i });
    await expect(tab).toBeVisible();
    await tab.click();
    
    await waitForLoading(page);
    await expect(page.getByText('Cidade de Destino')).toBeVisible();
    
    // Check if recommendation from mock appears
    await expect(page.getByText('Parque Estádio')).toBeVisible();
    await expect(page.getByText('€1.50')).toBeVisible();
  });
});
