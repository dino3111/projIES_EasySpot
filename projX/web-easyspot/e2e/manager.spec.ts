import { test, expect } from '@playwright/test';

test.describe('Manager Dashboard - Tariffs & Incidents', () => {
  test.beforeEach(async ({ page }) => {
    // We should mock the login or assume we can navigate to the page if we have a way to set the session
    // For now, let's assume we can go to the page
    // In a real scenario, we'd use a setup to login as a manager
    await page.goto('/manager/tarifas-ocorrencias');
  });

  test('should display tariffs correctly', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Tarifas & Ocorrências');
    await expect(page.getByRole('tab', { name: 'Tarifários' })).toBeVisible();
    
    // Check if at least one tariff is visible
    // We might need to wait for the API call to complete
    await expect(page.locator('text=Parque')).toBeVisible({ timeout: 10000 });
  });

  test('should display incidents log correctly', async ({ page }) => {
    await page.getByRole('tab', { name: 'Ocorrências' }).click();
    
    await expect(page.getByText('Ocorrências Encontradas')).toBeVisible();
    
    // Filter by open issues
    await page.getByRole('button', { name: 'Estado: Todos' }).click();
    await page.getByRole('button', { name: 'Aberto' }).click();
    
    // Check if incidents are listed
    // This depends on seed data
  });

  test('should allow exporting data', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('tarifas');
  });
});
