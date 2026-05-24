import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TariffsIncidentsPage } from '../TariffsIncidentsPage';
import { ProfileProvider } from '../../../context/ProfileContext';
import { AuthProvider } from '../../../context/AuthContext';
import { fetchManagerTariffs, fetchManagerAlerts, fetchManagerBilling } from '../../../services/managerApi';

// Mock services
vi.mock('../../../services/managerApi', () => ({
  fetchManagerTariffs: vi.fn(),
  fetchManagerAlerts: vi.fn(),
  fetchManagerBilling: vi.fn(),
  updateTariff: vi.fn(),
  updateAlertState: vi.fn(),
}));

vi.mock('../../../services/vehiclesApi', () => ({
  fetchVehicles: vi.fn().mockResolvedValue([]),
}));

const emptyPage = { content: [], totalElements: 0, totalPages: 0 };

const makeTariffPage = (items = [{ id: '1', parkId: 'park-1', parkName: 'Test Park', city: 'Aveiro', pricePerHour: 1.5, maxDaily: 12, monthlyPrice: 100, pricePerKwh: 0.3, status: 'ACTIVE' as const }]) => ({
  content: items,
  totalElements: items.length,
  totalPages: 1,
});

const makeAlertPage = (items: unknown[] = []) => ({
  content: items,
  totalElements: items.length,
  totalPages: items.length > 0 ? 1 : 0,
});

const billingPage = {
  content: [{
    id: 'bill-1',
    parkName: 'Test Park',
    entryTime: '2026-05-10T10:00:00Z',
    exitTime: '2026-05-10T12:00:00Z',
    durationMinutes: 120,
    licensePlate: '11-AA-22',
    zoneType: 'STANDARD',
    parkingRevenue: 4.5,
    evRevenue: 0,
    total: 4.5,
  }],
  totalElements: 1,
  totalPages: 1,
};

describe('TariffsIncidentsPage', () => {
  function renderPage() {
    return render(
      <AuthProvider>
        <ProfileProvider>
          <TariffsIncidentsPage />
        </ProfileProvider>
      </AuthProvider>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', async () => {
    (fetchManagerTariffs as any).mockReturnValue(new Promise<never>(() => {}));
    (fetchManagerAlerts as any).mockReturnValue(new Promise<never>(() => {}));
    (fetchManagerBilling as any).mockReturnValue(new Promise<never>(() => {}));

    renderPage();

    expect(screen.getByRole('status', { name: /a carregar/i })).toBeInTheDocument();
  });

  it('renders data after fetching', async () => {
    (fetchManagerTariffs as any).mockResolvedValue(makeTariffPage());
    (fetchManagerAlerts as any).mockResolvedValue(makeAlertPage([{
      id: 'alert-1',
      type: 'SENSOR',
      park: 'Test Park',
      zone: 'Zone A',
      spotNumber: 'A1',
      sensorId: 'S1',
      plate: '',
      description: 'Sensor failure',
      photoUrl: null,
      severity: 'CRITICAL',
      state: 'OPEN',
      createdAt: new Date().toISOString(),
      reportedBy: 'Driver 1',
      attributedTo: 'Tech 1',
      notes: ''
    }]));
    (fetchManagerBilling as any).mockResolvedValue(billingPage);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Tarifas & Ocorrências')).toBeTruthy();
    });

    expect(screen.getByText('Test Park')).toBeTruthy();
  });

  it('enables billing tab and shows billing table', async () => {
    (fetchManagerTariffs as any).mockResolvedValue(emptyPage);
    (fetchManagerAlerts as any).mockResolvedValue(emptyPage);
    (fetchManagerBilling as any).mockResolvedValue({
      content: [{
        id: 'bill-1',
        parkName: 'Billing Park',
        entryTime: '2026-05-10T10:00:00Z',
        exitTime: '2026-05-10T12:00:00Z',
        durationMinutes: 120,
        licensePlate: '11-AA-22',
        zoneType: 'STANDARD',
        parkingRevenue: 4.5,
        evRevenue: 0,
        total: 4.5,
      }],
      totalElements: 1,
      totalPages: 1,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Tarifas & Ocorrências')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('tab', { name: /faturação/i }));

    expect(screen.getByRole('tab', { name: /faturação/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Billing Park')).toBeTruthy();
    expect(screen.getByText('11-AA-22')).toBeTruthy();
  });

  it('shows tariff pagination when totalPages > 1', async () => {
    const content = Array.from({ length: 10 }, (_, i) => ({
      id: String(i + 1),
      parkId: `park-${i + 1}`,
      parkName: `Park ${i + 1}`,
      city: 'Aveiro',
      pricePerHour: 1.0,
      maxDaily: 10,
      monthlyPrice: 80,
      pricePerKwh: 0.2,
      status: 'ACTIVE' as const,
    }));

    (fetchManagerTariffs as any).mockResolvedValue({ content, totalElements: 25, totalPages: 3 });
    (fetchManagerAlerts as any).mockResolvedValue(emptyPage);
    (fetchManagerBilling as any).mockResolvedValue({ content: [], totalElements: 0, totalPages: 0 });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/25 tarifários/)).toBeTruthy();
    });
    expect(screen.getByText(/página 1 de 3/)).toBeTruthy();
  });

  it('re-fetches tariffs with district filter when dropdown changes', async () => {
    (fetchManagerTariffs as any).mockResolvedValue(emptyPage);
    (fetchManagerAlerts as any).mockResolvedValue(emptyPage);
    (fetchManagerBilling as any).mockResolvedValue({ content: [], totalElements: 0, totalPages: 0 });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Tarifas & Ocorrências')).toBeTruthy();
    });

    const districtSelect = screen.getByRole('combobox', { name: /filtrar por distrito/i });
    fireEvent.change(districtSelect, { target: { value: 'Lisboa' } });

    await waitFor(() => {
      expect(fetchManagerTariffs).toHaveBeenCalledWith(
        expect.objectContaining({ district: 'Lisboa', page: 0 })
      );
    });
  });

  it('re-fetches incidents when state filter changes', async () => {
    (fetchManagerTariffs as any).mockResolvedValue(emptyPage);
    (fetchManagerAlerts as any).mockResolvedValue(emptyPage);
    (fetchManagerBilling as any).mockResolvedValue({ content: [], totalElements: 0, totalPages: 0 });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Tarifas & Ocorrências')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('tab', { name: /ocorrências/i }));

    await waitFor(() => {
      expect(screen.getByText('Abertos')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Abertos'));

    await waitFor(() => {
      expect(fetchManagerAlerts).toHaveBeenCalledWith(
        expect.objectContaining({ state: 'aberto', page: 0 })
      );
    });
  });
});
