import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { DashboardTechnicianPage } from '../DashboardTechnicianPage';

const techApiMock = vi.hoisted(() => ({
  fetchTechnicianDashboard: vi.fn(),
  updateAlertState: vi.fn(),
}));

vi.mock('../../../services/technicianApi', () => techApiMock);

const mockDashboard = {
  kpis: {
    totalSensors: 12,
    operationalSensors: 10,
    uptimePct: 96.5,
    failuresToday: 2,
    failuresTodayVariancePct: 10,
    meanTimeToRepair: '2h 30m',
    mttrVariancePct: -5,
  },
  uptimeLast7Days: [
    { date: '2026-05-01', day: 'Qui', uptimePct: 97.0 },
    { date: '2026-05-02', day: 'Sex', uptimePct: 96.5 },
  ],
  sensorDistribution: [
    { status: 'operational', label: 'Operacional', count: 10, percentage: 83.3 },
    { status: 'offline',     label: 'Offline',     count: 2,  percentage: 16.7 },
  ],
  urgentWorkOrders: [
    {
      id: 'order-1',
      type: 'sensor',
      park: 'Fórum Aveiro',
      zone: 'Zona B',
      sensorId: 'IR-AV1-B07',
      description: 'Falha de leitura IR',
      severity: 'critical',
      state: 'open',
      createdAt: '2026-05-08T09:00:00Z',
      attributedTo: null,
    },
  ],
};

describe('DashboardTechnicianPage', () => {
  it('shows loading state initially', () => {
    techApiMock.fetchTechnicianDashboard.mockReturnValue(new Promise(() => {}));

    render(<DashboardTechnicianPage />);

    expect(screen.getByText(/a carregar painel técnico/i)).toBeInTheDocument();
  });

  it('renders KPI cards after successful load', async () => {
    techApiMock.fetchTechnicianDashboard.mockResolvedValueOnce(mockDashboard);

    render(<DashboardTechnicianPage />);

    await waitFor(() => expect(screen.getByText('12')).toBeInTheDocument());
    expect(screen.getByText('Total Sensores')).toBeInTheDocument();
    expect(screen.getByText('96.5%')).toBeInTheDocument();
    expect(screen.getByText('2h 30m')).toBeInTheDocument();
  });

  it('shows error state with retry button on API failure', async () => {
    techApiMock.fetchTechnicianDashboard.mockRejectedValueOnce(new Error('Network error'));

    render(<DashboardTechnicianPage />);

    await waitFor(() => expect(screen.getByText(/Network error/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
  });

  it('shows urgent orders section when orders exist', async () => {
    techApiMock.fetchTechnicianDashboard.mockResolvedValueOnce(mockDashboard);

    render(<DashboardTechnicianPage />);

    await waitFor(() => expect(screen.getByRole('heading', { name: /ordens urgentes/i })).toBeInTheDocument());
    expect(screen.getByText('Falha de leitura IR')).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('Fórum Aveiro'))).toBeInTheDocument();
  });

  it('calls updateAlertState and refreshes when Atualizar is clicked', async () => {
    techApiMock.fetchTechnicianDashboard
      .mockResolvedValueOnce(mockDashboard)
      .mockResolvedValueOnce({ ...mockDashboard, urgentWorkOrders: [] });
    techApiMock.updateAlertState.mockResolvedValueOnce(undefined);

    render(<DashboardTechnicianPage />);

    await waitFor(() => screen.getByText('Falha de leitura IR'));
    fireEvent.click(screen.getByRole('button', { name: /atualizar estado da ordem/i }));

    await waitFor(() => expect(techApiMock.updateAlertState).toHaveBeenCalledWith('order-1', 'IN_PROGRESS'));
  });
});
