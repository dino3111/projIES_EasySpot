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
    (fetchManagerTariffs as any).mockReturnValue(new Promise(() => {}));
    (fetchManagerAlerts as any).mockReturnValue(new Promise(() => {}));
    (fetchManagerBilling as any).mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByRole('status', { name: /a carregar/i })).toBeInTheDocument();
  });

  it('renders data after fetching', async () => {
    (fetchManagerTariffs as any).mockResolvedValue([
      {
        id: '1',
        parkId: 'park-1',
        parkName: 'Test Park',
        city: 'Aveiro',
        pricePerHour: 1.5,
        maxDaily: 12,
        monthlyPrice: 100,
        pricePerKwh: 0.3,
        status: 'ACTIVE'
      }
    ]);
    (fetchManagerAlerts as any).mockResolvedValue([
      {
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
      }
    ]);
    (fetchManagerBilling as any).mockResolvedValue({
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
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Tarifas & Ocorrências')).toBeTruthy();
    });

    expect(screen.getByText('Test Park')).toBeTruthy();
  });

  it('enables billing tab and shows billing table', async () => {
    (fetchManagerTariffs as any).mockResolvedValue([]);
    (fetchManagerAlerts as any).mockResolvedValue([]);
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
});
