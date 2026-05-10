import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TariffsIncidentsPage } from '../TariffsIncidentsPage';
import { ProfileProvider } from '../../../context/ProfileContext';
import { fetchManagerTariffs, fetchManagerAlerts } from '../../../services/managerApi';

vi.mock('../../../services/managerApi', () => ({
  fetchManagerTariffs: vi.fn(),
  fetchManagerAlerts: vi.fn(),
  updateTariff: vi.fn(),
  updateAlertState: vi.fn(),
}));

vi.mock('../../../services/vehiclesApi', () => ({
  fetchVehicles: vi.fn().mockResolvedValue([]),
}));

describe('TariffsIncidentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (fetchManagerTariffs as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    (fetchManagerAlerts as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    render(
      <ProfileProvider>
        <TariffsIncidentsPage />
      </ProfileProvider>
    );

    const spinner = document.querySelector('.fa-spin');
    expect(spinner).toBeTruthy();
  });

  it('renders data after fetching', async () => {
    (fetchManagerTariffs as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: '1',
        parkId: 'park-1',
        parkName: 'Test Park',
        city: 'Aveiro',
        pricePerHour: 1.5,
        maxDaily: 12,
        monthlyPrice: 100,
        pricePerKwh: 0.3,
        status: 'ACTIVE',
      },
    ]);
    (fetchManagerAlerts as ReturnType<typeof vi.fn>).mockResolvedValue([
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
        notes: '',
      },
    ]);

    render(
      <ProfileProvider>
        <TariffsIncidentsPage />
      </ProfileProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Tarifas & Ocorrências')).toBeTruthy();
    });

    expect(screen.getByText('Test Park')).toBeTruthy();
  });
});
