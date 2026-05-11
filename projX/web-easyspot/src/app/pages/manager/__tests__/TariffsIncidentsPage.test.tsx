import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TariffsIncidentsPage } from '../TariffsIncidentsPage';
import { ProfileProvider } from '../../../context/ProfileContext';
import { AuthProvider } from '../../../context/AuthContext';
import { fetchManagerTariffs, fetchManagerAlerts } from '../../../services/managerApi';
import { fetchAllParksSummary } from '../../../services/parksCatalog';

import { fetchVehicles } from '../../../services/vehiclesApi';

// Mock services
vi.mock('../../../services/managerApi', () => ({
  fetchManagerTariffs: vi.fn(),
  fetchManagerAlerts: vi.fn(),
  updateTariff: vi.fn(),
  updateAlertState: vi.fn(),
}));

vi.mock('../../../services/parksCatalog', () => ({
  fetchAllParksSummary: vi.fn(),
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
    (fetchAllParksSummary as any).mockReturnValue(new Promise(() => {}));

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
        severity: 'CRITICAL',
        state: 'OPEN',
        createdAt: new Date().toISOString(),
        attributedTo: 'Tech 1',
        notes: ''
      }
    ]);
    (fetchAllParksSummary as any).mockResolvedValue([
      { id: 'park-1', name: 'Test Park', city: 'Aveiro' }
    ]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Tarifas & Ocorrências')).toBeTruthy();
    });

    expect(screen.getByText('Test Park')).toBeTruthy();
  });
});
