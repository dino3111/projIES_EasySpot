import { test, expect } from '@playwright/test';

// JWT with groups: ["MANAGER"] — parsed client-side only, signature not verified
const managerJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtZ3IxIiwibmFtZSI6Ikpvw6NvIEdlc3RvciIsImVtYWlsIjoiam9hb0BlYXN5c3BvdC5wdCIsImdyb3VwcyI6WyJNQU5BR0VSIl19.sig';

const mockTariff = {
  id: 'tariff-1',
  parkId: 'park-1',
  parkName: 'Parque Central',
  city: 'Aveiro',
  pricePerHour: 1.5,
  maxDaily: 12.0,
  monthlyPrice: 100.0,
  pricePerKwh: 0.3,
  status: 'ACTIVE',
};

const mockAlert = {
  id: 'alert-1',
  type: 'SENSOR',
  park: 'Parque Central',
  zone: 'Zone A',
  spotNumber: 'A1',
  sensorId: 'S1',
  plate: '',
  description: 'Sensor failure detected',
  severity: 'CRITICAL',
  state: 'OPEN',
  createdAt: new Date().toISOString(),
  attributedTo: 'Tech 1',
  notes: '',
};

test.describe('Manager Dashboard - Tariffs & Incidents', () => {
  test.beforeEach(async ({ page }) => {
    // Inject auth token and set profile as MANAGER in localStorage
    await page.addInitScript(({ token }) => {
      sessionStorage.setItem('es_access_token', token);
      sessionStorage.setItem('es_id_token', token);
      localStorage.setItem('easyspot_profile', 'MANAGER');
      localStorage.setItem('easyspot_account_type', 'MANAGER');
    }, { token: managerJwt });

    // Mock manager tariffs API
    await page.route('**/api/manager/tariffs**', async (route) => {
      await route.fulfill({
        json: {
          content: [mockTariff],
          totalElements: 1,
          totalPages: 1,
        },
      });
    });

    // Mock alerts API
    await page.route('**/api/alerts**', async (route) => {
      await route.fulfill({ json: [mockAlert] });
    });

    // Mock vehicles (loaded by ProfileProvider)
    await page.route('**/api/vehicles', async (route) => {
      await route.fulfill({ json: [] });
    });

    await page.goto('/manager/tariffs-incidents');
  });

  test('should display tariffs correctly', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Tarifas & Ocorrências');
    await expect(page.getByRole('tab', { name: /Tarifários/i })).toBeVisible();

    // Wait for tariff data to load
    await expect(page.getByText('Parque Central')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Aveiro')).toBeVisible();
  });

  test('should display incidents tab correctly', async ({ page }) => {
    // Switch to incidents tab
    await page.getByRole('tab', { name: /Ocorrências/i }).click();

    // Incident card should appear
    await expect(page.getByText('Parque Central')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Sensor failure detected')).toBeVisible();
  });

  test('should allow exporting tariffs data', async ({ page }) => {
    // Wait for page to load with data
    await expect(page.getByText('Parque Central')).toBeVisible({ timeout: 10000 });

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('tarifas');
  });
});
