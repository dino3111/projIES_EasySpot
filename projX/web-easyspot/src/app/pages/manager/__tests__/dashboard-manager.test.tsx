import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import { DashboardManagerPage } from '../DashboardManagerPage';
import type { ManagerDashboardResponse } from '../../../services/managerApi';

vi.mock('recharts', () => ({
  ResponsiveContainer: () => null,
  BarChart: () => null,
  AreaChart: () => null,
  PieChart: () => null,
  Bar: () => null,
  Area: () => null,
  Pie: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

vi.mock('../../../services/managerApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../services/managerApi')>();
  return { ...actual, fetchManagerDashboard: vi.fn() };
});

import { fetchManagerDashboard } from '../../../services/managerApi';

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
      photoUrl: null,
      severity: 'critica',
      state: 'aberto',
      createdAt: '2026-03-09T08:14:00Z',
      reportedBy: 'Filipe Teixeira',
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
  beforeEach(() => {
    vi.mocked(fetchManagerDashboard).mockReset();
  });

  it('shows loading state initially', () => {
    vi.mocked(fetchManagerDashboard).mockReturnValue(new Promise(() => {}));
    render(<MemoryRouter><DashboardManagerPage /></MemoryRouter>);
    expect(document.querySelector('[aria-busy="true"], .fa-spinner')).toBeInTheDocument();
  });

  it('renders KPI cards after data loads', async () => {
    vi.mocked(fetchManagerDashboard).mockResolvedValue(mockDashboard);
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
    vi.mocked(fetchManagerDashboard).mockRejectedValue(new Error('Erro de servidor'));
    render(<MemoryRouter><DashboardManagerPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Erro de servidor')).toBeInTheDocument();
    });
  });

  it('renders park performance table with backend data', async () => {
    vi.mocked(fetchManagerDashboard).mockResolvedValue(mockDashboard);
    render(<MemoryRouter><DashboardManagerPage /></MemoryRouter>);
    expect(await screen.findByText('Desempenho por Parque — Hoje')).toBeInTheDocument();
    expect(screen.getAllByText('Fórum Aveiro').length).toBeGreaterThan(0);
    expect(screen.getByText('€342.50')).toBeInTheDocument();
    expect(screen.getAllByText('Glicínias Plaza').length).toBeGreaterThan(0);
  });

  it('renders recent alerts section', async () => {
    vi.mocked(fetchManagerDashboard).mockResolvedValue(mockDashboard);
    render(<MemoryRouter><DashboardManagerPage /></MemoryRouter>);
    expect(await screen.findByText('Alertas Recentes')).toBeInTheDocument();
    expect(screen.getByText('1 em aberto')).toBeInTheDocument();
    expect(screen.getByText('Sensor infravermelho sem leituras.')).toBeInTheDocument();
  });

  it('renders zone occupancy donut section', async () => {
    vi.mocked(fetchManagerDashboard).mockResolvedValue(mockDashboard);
    render(<MemoryRouter><DashboardManagerPage /></MemoryRouter>);
    expect(await screen.findByText('Ocupação por Zona')).toBeInTheDocument();
    expect(screen.getByText('Normal')).toBeInTheDocument();
    expect(screen.getByText('510/680')).toBeInTheDocument();
  });
});
