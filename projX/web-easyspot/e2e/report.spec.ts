import { test, expect } from '@playwright/test';

const jwt =
  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1MSIsIm5hbWUiOiJBbmEiLCJlbWFpbCI6ImFuYUBlYXN5c3BvdC5wdCIsImdyb3VwcyI6WyJEUklWRVIiXX0.sig';

const parks = [
  { id: 'park-1', name: 'Parque Central', localidade: 'Aveiro' },
  { id: 'park-2', name: 'Forum Aveiro', localidade: 'Aveiro' },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript((token) => {
    sessionStorage.setItem('es_access_token', token);
    sessionStorage.setItem('es_id_token', token);
  }, jwt);

  await page.route('**/api/profile', (route) =>
    route.fulfill({ json: { role: 'DRIVER', name: 'Ana Silva', email: 'ana@easyspot.pt' } }),
  );

  await page.route('**/api/parks/catalog/summary', (route) =>
    route.fulfill({ json: parks }),
  );

  await page.route('**/api/vehicles', (route) =>
    route.fulfill({ json: [] }),
  );

  await page.route('**/api/payments/setup-status', (route) =>
    route.fulfill({ json: { configured: true } }),
  );
});

test('Condutor vai ao perfil → clica em Reportar → preenche formulário → submete → vê confirmação', async ({ page }) => {
  await page.goto('/profile');
  await expect(page.getByText(/Ana Silva/i)).toBeVisible();

  // Link "Reportar Problema" present in DriverProfile
  const reportLink = page.getByRole('link', { name: /Reportar Problema/i }).first();
  await expect(reportLink).toBeVisible();
  await reportLink.click();

  await expect(page).toHaveURL(/\/report/);
  await expect(page.getByText(/Reportar Estacionamento/i)).toBeVisible();

  // Fill park
  await page.getByRole('combobox').selectOption({ value: 'park-1' });

  // Fill zone and spot
  await page.getByPlaceholder(/Ex: Piso -1, Zona A/i).fill('Piso 0');
  await page.getByPlaceholder(/Ex: A-07, MR-02/i).fill('MR-03');

  // Select violation type
  await page.getByRole('button', { name: /Lugar de Mobilidade Reduzida/i }).click();

  // Fill description
  await page.getByPlaceholder(/Descreva o que observou/i).fill(
    'Veículo sem dístico de mobilidade reduzida estacionado no lugar MR-03.',
  );

  // Mock API
  await page.route('**/api/reports', (route) =>
    route.fulfill({
      status: 201,
      json: {
        id: 'rep-e2e-001',
        type: 'CLIENT',
        parkId: 'park-1',
        parkName: 'Parque Central',
        zone: 'Piso 0',
        spotNumber: 'MR-03',
        plate: null,
        description: 'Veículo sem dístico de mobilidade reduzida estacionado no lugar MR-03.',
        photoUrl: null,
        severity: 'WARNING',
        state: 'OPEN',
        createdAt: new Date().toISOString(),
      },
    }),
  );

  await page.getByRole('button', { name: /Enviar Denúncia/i }).click();

  await expect(page.getByText(/Denúncia Enviada/i)).toBeVisible();
  await expect(page.getByText(/Em análise/i)).toBeVisible();
  await expect(page.getByText(/Parque Central/i)).toBeVisible();
});

test('Submissão com formulário incompleto mostra mensagens de erro', async ({ page }) => {
  await page.goto('/report');
  await expect(page.getByText(/Reportar Estacionamento/i)).toBeVisible();

  // Submit without filling anything
  await page.getByRole('button', { name: /Enviar Denúncia/i }).click();

  await expect(page.getByText(/Selecione um parque/i)).toBeVisible();
  await expect(page.getByText(/Indique a zona/i)).toBeVisible();
  await expect(page.getByText(/Indique o número do lugar/i)).toBeVisible();
  await expect(page.getByText(/Selecione o tipo de infração/i)).toBeVisible();
  await expect(page.getByText(/A descrição deve ter/i)).toBeVisible();

  // Should NOT navigate to confirmation
  await expect(page.getByText(/Denúncia Enviada/i)).not.toBeVisible();
});

test('Erro do backend mostra mensagem de erro inline', async ({ page }) => {
  await page.goto('/report');
  await expect(page.getByText(/Reportar Estacionamento/i)).toBeVisible();

  await page.getByRole('combobox').selectOption({ value: 'park-1' });
  await page.getByPlaceholder(/Ex: Piso -1, Zona A/i).fill('A');
  await page.getByPlaceholder(/Ex: A-07, MR-02/i).fill('A-01');
  await page.getByRole('button', { name: /A Bloquear Acesso/i }).click();
  await page.getByPlaceholder(/Descreva o que observou/i).fill(
    'Veículo bloqueia completamente a saída de emergência do parque.',
  );

  await page.route('**/api/reports', (route) =>
    route.fulfill({ status: 500, body: JSON.stringify({ message: 'Erro interno do servidor' }) }),
  );

  await page.getByRole('button', { name: /Enviar Denúncia/i }).click();

  await expect(page.getByText(/Erro interno do servidor/i)).toBeVisible();
  await expect(page.getByText(/Denúncia Enviada/i)).not.toBeVisible();
});

test('Após confirmação, clicar em Nova Denúncia volta ao formulário limpo', async ({ page }) => {
  await page.goto('/report');
  await expect(page.getByText(/Reportar Estacionamento/i)).toBeVisible();

  await page.getByRole('combobox').selectOption({ value: 'park-2' });
  await page.getByPlaceholder(/Ex: Piso -1, Zona A/i).fill('B');
  await page.getByPlaceholder(/Ex: A-07, MR-02/i).fill('B-10');
  await page.getByRole('button', { name: /Lugar de Carregamento EV/i }).click();
  await page.getByPlaceholder(/Descreva o que observou/i).fill(
    'Veículo a gasóleo no lugar EV bloqueando carregadores há mais de 3 horas.',
  );

  await page.route('**/api/reports', (route) =>
    route.fulfill({
      status: 201,
      json: {
        id: 'rep-e2e-002',
        type: 'CLIENT',
        parkId: 'park-2',
        parkName: 'Forum Aveiro',
        zone: 'B',
        spotNumber: 'B-10',
        plate: null,
        description: 'Veículo a gasóleo no lugar EV.',
        photoUrl: null,
        severity: 'WARNING',
        state: 'OPEN',
        createdAt: new Date().toISOString(),
      },
    }),
  );

  await page.getByRole('button', { name: /Enviar Denúncia/i }).click();
  await expect(page.getByText(/Denúncia Enviada/i)).toBeVisible();

  await page.getByRole('button', { name: /Nova Denúncia/i }).click();

  await expect(page.getByText(/Reportar Estacionamento/i)).toBeVisible();
  // Form should be reset — combobox back to default
  const select = page.getByRole('combobox');
  await expect(select).toHaveValue('');
});
