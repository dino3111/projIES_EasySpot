import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ManagerParksPage } from '../ManagerParksPage';
import { AuthProvider } from '../../../context/AuthContext';
import { ProfileProvider } from '../../../context/ProfileContext';
import {
  fetchManagerParks,
  fetchParkAssignments,
  updateParkStatus,
} from '../../../services/managerApi';

vi.mock('../../../services/managerApi', () => ({
  fetchManagerParks: vi.fn(),
  fetchParkAssignments: vi.fn(),
  updateParkStatus: vi.fn(),
  fetchTechnicians: vi.fn().mockResolvedValue([]),
  createPark: vi.fn(),
  configureParkLayout: vi.fn(),
  assignTechnicianToPark: vi.fn(),
  removeTechnicianFromPark: vi.fn(),
}));

vi.mock('../../../services/parksApi', () => ({
  fetchParksList: vi.fn().mockResolvedValue({ items: [], pagination: {} }),
}));

const activeParks = [
  {
    id: 'park-1',
    name: 'Parque Ativo',
    city: 'Aveiro',
    address: 'Rua A, 1',
    latitude: 40.0,
    longitude: -8.0,
    openingHours: '24h',
    totalSpaces: 50,
    status: 'ACTIVE' as const,
  },
];

const mixedParks = [
  ...activeParks,
  {
    id: 'park-2',
    name: 'Parque Suspenso',
    city: 'Porto',
    address: 'Rua B, 2',
    latitude: 41.0,
    longitude: -8.5,
    openingHours: '08:00-22:00',
    totalSpaces: 30,
    status: 'SUSPENDED' as const,
  },
];

function renderPage() {
  return render(
    <AuthProvider>
      <ProfileProvider>
        <ManagerParksPage />
      </ProfileProvider>
    </AuthProvider>
  );
}

describe('ManagerParksPage — park status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchParkAssignments as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  it('shows ACTIVE badge for active park', async () => {
    (fetchManagerParks as ReturnType<typeof vi.fn>).mockResolvedValue(activeParks);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Parque Ativo')).toBeTruthy();
    });

    expect(screen.getByText('Ativo')).toBeTruthy();
  });

  it('shows Suspenso badge for suspended park', async () => {
    (fetchManagerParks as ReturnType<typeof vi.fn>).mockResolvedValue(mixedParks);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Parque Suspenso')).toBeTruthy();
    });

    expect(screen.getByText('Suspenso')).toBeTruthy();
  });

  it('shows both parks regardless of status (manager sees all)', async () => {
    (fetchManagerParks as ReturnType<typeof vi.fn>).mockResolvedValue(mixedParks);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Parque Ativo')).toBeTruthy();
    });

    expect(screen.getByText('Parque Suspenso')).toBeTruthy();
  });

  it('clicking "Suspender Parque" calls updateParkStatus with SUSPENDED', async () => {
    (fetchManagerParks as ReturnType<typeof vi.fn>).mockResolvedValue(activeParks);
    (updateParkStatus as ReturnType<typeof vi.fn>).mockResolvedValue({ ...activeParks[0], status: 'SUSPENDED' });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Parque Ativo')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /suspender parque/i }));

    await waitFor(() => {
      expect(updateParkStatus).toHaveBeenCalledWith('park-1', 'SUSPENDED');
    });
  });

  it('clicking "Reativar Parque" calls updateParkStatus with ACTIVE', async () => {
    (fetchManagerParks as ReturnType<typeof vi.fn>).mockResolvedValue([mixedParks[1]]);
    (updateParkStatus as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mixedParks[1], status: 'ACTIVE' });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Parque Suspenso')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /reativar parque/i }));

    await waitFor(() => {
      expect(updateParkStatus).toHaveBeenCalledWith('park-2', 'ACTIVE');
    });
  });

  it('updates badge optimistically after status toggle', async () => {
    (fetchManagerParks as ReturnType<typeof vi.fn>).mockResolvedValue(activeParks);
    (updateParkStatus as ReturnType<typeof vi.fn>).mockResolvedValue({ ...activeParks[0], status: 'SUSPENDED' });

    renderPage();

    await waitFor(() => expect(screen.getByText('Ativo')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: /suspender parque/i }));

    await waitFor(() => {
      expect(screen.getByText('Suspenso')).toBeTruthy();
    });
  });
});
