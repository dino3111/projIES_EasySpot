import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CostsPage } from '../costs/CostsPage';

// Mock the contexts
vi.mock('../../../context/ProfileContext', () => ({
  useProfile: vi.fn(() => ({
    vehicles: [
      { id: 'v1', plate: 'AA-11-BB', isPrimary: true, isEV: true, isAccessible: false, model: 'Model 3' },
    ],
  })),
}));

vi.mock('../../../context/LoadingContext', () => ({
  withGlobalLoading: vi.fn((fn) => fn()),
}));

// Mock the API services
const costsApiMock = vi.hoisted(() => ({
  fetchDriverSpending: vi.fn(),
  fetchParkingPlanning: vi.fn(),
}));
vi.mock('../../../services/costsApi', () => costsApiMock);

const parksApiMock = vi.hoisted(() => ({
  fetchParkCities: vi.fn(),
}));
vi.mock('../../../services/parksApi', () => parksApiMock);

// Mock Recharts to avoid issues in Vitest
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  AreaChart: ({ children }: any) => <div>{children}</div>,
  Area: () => <div>Area</div>,
  XAxis: () => <div>XAxis</div>,
  YAxis: () => <div>YAxis</div>,
  CartesianGrid: () => <div>CartesianGrid</div>,
  Tooltip: () => <div>Tooltip</div>,
  PieChart: ({ children }: any) => <div>{children}</div>,
  Pie: () => <div>Pie</div>,
  Cell: () => <div>Cell</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => <div>Bar</div>,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => <div>Line</div>,
}));

const mockSpending = {
  totals: { totalSpent: 100.50, avgPerSession: 10.05, parkingSpent: 80.00, chargingSpent: 20.50 },
  insights: { mostUsedPark: 'Parque Central', costliestSession: null, sessionCount: 10 },
  timeseries: [{ date: '2026-03-01', totalSpent: 10.50 }],
  breakdownByPark: [{ id: 'p1', name: 'Parque Central', totalSpent: 100.50 }],
  breakdownByVehicle: [{ id: 'v1', name: 'AA-11-BB', totalSpent: 100.50 }],
  history: [
    { parkName: 'Parque Central', date: '2026-03-01T10:00:00Z', durationMinutes: 60, vehicle: 'AA-11-BB', totalSpent: 10.50, status: 'COMPLETED' }
  ]
};

describe('CostsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders ExpensesTab by default and loads spending data', async () => {
    costsApiMock.fetchDriverSpending.mockResolvedValue(mockSpending);
    
    render(
      <MemoryRouter initialEntries={['/costs']}>
        <CostsPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Os Meus Gastos/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByText(/€100.50/i)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/Parque Central/i)[0]).toBeInTheDocument();
    });
    expect(costsApiMock.fetchDriverSpending).toHaveBeenCalled();
  });

  it('switches to PlanningTab and loads recommendations', async () => {
    parksApiMock.fetchParkCities.mockResolvedValue(['Aveiro', 'Coimbra']);
    costsApiMock.fetchParkingPlanning.mockResolvedValue({
      recommendations: [
        {
          id: 'p1', name: 'Parque Estádio', address: 'Rua do Estádio', openingHours: '24h',
          distanceMeters: 500, pricePerHour: 1.5,
          currentOccupancy: { occupied: 10, total: 100, occupancyPercent: 10, status: 'AVAILABLE' },
          occupancyByHour: []
        }
      ]
    });

    render(
      <MemoryRouter initialEntries={['/costs?tab=planeamento']}>
        <CostsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Cidade de Destino/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Parque Estádio/i)).toBeInTheDocument();
      expect(screen.getByText(/€1.50/i)).toBeInTheDocument();
    });
  });
});
