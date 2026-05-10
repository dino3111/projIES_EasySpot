import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { DashboardManagerPage } from '../DashboardManagerPage';
import type { ManagerDashboardResponse } from '../../../services/dashboardApi';

const dashboardApiMock = vi.hoisted(() => ({
  dashboardApi: { getManagerDashboard: vi.fn() },
  ZONE_COLORS: { standard: '#7357ec', ev: '#22c55e', accessible: '#3b82f6', reserved: '#f59e0b' },
}));
vi.mock('../../../services/dashboardApi', () => dashboardApiMock);

const mockDashboard: ManagerDashboardResponse = {
  kpis: {
    todayEntrances: 303,
    entranceVariance: 14.4,
    averageOccupancy: 69,
    totalLots: 1143,
    occupiedLots: 769,
    totalEarnings: 1745.6,
    earningsVariance: 26.4,
    averageOccupancyTime: '2h 14m',
    alertsOpened: 3,
    activeParks: 9,
  },
  seriesLast7Days: [
    { date: '2026-03-09', day: 'Seg', entrances: 303, earnings: 1745.6 },
  ],
  occupancyPerZone: [
    { name: 'Normal', type: 'standard', total: 680, occupied: 510 },
    { name: 'Carregamento EV', type: 'ev', total: 80, occupied: 52 },
  ],
  occupancyPerHour: [
    { time: '08h', occupancy: 42 },
    { time: '09h', occupancy: 68 },
  ],
  lastAlerts: [
    {
      id: 'iss-001',
      type: 'sensor',
      park: 'Fórum Aveiro',
      zone: 'Piso 0 – Zona B',
      sensorId: 'IR-AV1-B07',
      plate: null,
      description: 'Sensor infravermelho sem leituras.',
      severity: 'critica',
      state: 'aberto',
      createdAt: '2026-03-09T08:14:00Z',
      attributedTo: null,
      notes: null,
    },
  ],
  performancePerPark: [
    { name: 'Fórum Aveiro', city: 'Aveiro', entrances: 58, occupancyPercentage: 74, earnings: 342.5 },
    { name: 'Glicínias Plaza', city: 'Aveiro', entrances: 42, occupancyPercentage: 61, earnings: 198.2 },
  ],
};

describe('DashboardManagerPage', () => {
  it('shows loading state initially', () => {
    dashboardApiMock.dashboardApi.getManagerDashboard.mockReturnValue(new Promise(() => {}));
    render(<MemoryRouter><DashboardManagerPage /></MemoryRouter>);
    expect(screen.getByLabelText('A carregar painel')).toBeInTheDocument();
  });

  it('renders KPI cards after data loads', async () => {
    dashboardApiMock.dashboardApi.getManagerDashboard.mockResolvedValue(mockDashboard);
    render(<MemoryRouter><DashboardManagerPage /></MemoryRouter>);
    expect(await screen.findByText('Entradas Hoje')).toBeInTheDocument();
    expect(screen.getByText('303')).toBeInTheDocument();
    expect(screen.getByText('Taxa de Ocupação')).toBeInTheDocument();
    expect(screen.getByText('69%')).toBeInTheDocument();
    expect(screen.getByText('Receita Hoje')).toBeInTheDocument();
    expect(screen.getByText('€1745.60')).toBeInTheDocument();
    expect(screen.getByText('Tempo Médio')).toBeInTheDocument();
    expect(screen.getByText('2h 14m')).toBeInTheDocument();
  });

  it('shows error state when API fails', async () => {
    dashboardApiMock.dashboardApi.getManagerDashboard.mockRejectedValue(new Error('Erro de servidor'));
    render(<MemoryRouter><DashboardManagerPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByText('Erro de servidor')).toBeInTheDocument();
  });

  it('renders park performance table with backend data', async () => {
    dashboardApiMock.dashboardApi.getManagerDashboard.mockResolvedValue(mockDashboard);
    render(<MemoryRouter><DashboardManagerPage /></MemoryRouter>);
    expect(await screen.findByText('Desempenho por Parque — Hoje')).toBeInTheDocument();
    expect(screen.getAllByText('Fórum Aveiro').length).toBeGreaterThan(0);
    expect(screen.getByText('€342.50')).toBeInTheDocument();
    expect(screen.getAllByText('Glicínias Plaza').length).toBeGreaterThan(0);
  });

  it('renders recent alerts section', async () => {
    dashboardApiMock.dashboardApi.getManagerDashboard.mockResolvedValue(mockDashboard);
    render(<MemoryRouter><DashboardManagerPage /></MemoryRouter>);
    expect(await screen.findByText('Alertas Recentes')).toBeInTheDocument();
    expect(screen.getByText('1 em aberto')).toBeInTheDocument();
    expect(screen.getByText('Sensor infravermelho sem leituras.')).toBeInTheDocument();
  });

  it('renders zone occupancy donut section', async () => {
    dashboardApiMock.dashboardApi.getManagerDashboard.mockResolvedValue(mockDashboard);
    render(<MemoryRouter><DashboardManagerPage /></MemoryRouter>);
    expect(await screen.findByText('Ocupação por Zona')).toBeInTheDocument();
    expect(screen.getByText('Normal')).toBeInTheDocument();
    expect(screen.getByText('510/680')).toBeInTheDocument();
  });
});
