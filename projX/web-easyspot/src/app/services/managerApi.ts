import { request } from '../../services/apiService';
import type { TariffEntry, IssueReport } from '../data/gestorData';

// ─── Dashboard types ──────────────────────────────────────────────────────────

export interface DashboardKpiSummary {
  todayEntrances: number;
  entranceVariance: number;
  averageOccupancy: number;
  totalLots: number;
  occupiedLots: number;
  totalEarnings: number;
  earningsVariance: number;
  averageOccupancyTime: string;
  alertsOpened: number;
  activeParks: number;
}

export interface DashboardDailyMetric {
  date: string;
  day: string;
  entrances: number;
  earnings: number;
}

export interface DashboardZoneOccupancy {
  name: string;
  type: string;
  total: number;
  occupied: number;
}

export interface DashboardHourlyOccupancy {
  time: string;
  occupancy: number;
}

export interface DashboardAlertSummary {
  id: string;
  type: string;
  park: string;
  zone: string;
  sensorId: string;
  plate: string;
  description: string;
  severity: string;
  state: string;
  createdAt: string;
  attributedTo: string;
  notes: string;
}

export interface DashboardParkSummary {
  name: string;
  city: string;
  entrances: number;
  occupancyPercentage: number;
  earnings: number;
}

export interface ManagerDashboardResponse {
  kpis: DashboardKpiSummary;
  seriesLast7Days: DashboardDailyMetric[];
  occupancyPerZone: DashboardZoneOccupancy[];
  occupancyPerHour: DashboardHourlyOccupancy[];
  lastAlerts: DashboardAlertSummary[];
  performancePerPark: DashboardParkSummary[];
}

export const fetchManagerDashboard = () =>
  request<ManagerDashboardResponse>('/api/manager/dashboard');

export interface TariffResponse {
  id: string;
  parkId: string;
  parkName: string;
  city: string;
  pricePerHour: number;
  maxDaily: number;
  monthlyPrice: number;
  pricePerKwh: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface AlertResponse {
  id: string;
  type: string;
  park: string;
  zone: string;
  spotNumber: string;
  sensorId: string;
  plate: string;
  description: string;
  severity: string;
  state: string;
  createdAt: string;
  attributedTo: string;
  notes: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
}

export const fetchManagerTariffs = async (parkId?: string) => {
  const query = parkId ? `?parkId=${parkId}` : '';
  const response = await request<Page<TariffResponse>>(`/api/manager/tariffs${query}`);
  return response.content;
};

export const fetchManagerAlerts = async (parkId?: string, state?: string, severity?: string) => {
  const params = new URLSearchParams();
  if (parkId) params.append('parkId', parkId);
  if (state && state !== 'todos') params.append('state', state.toUpperCase().replace('-', '_'));
  if (severity && severity !== 'todos') params.append('severity', severity.toUpperCase());

  const query = params.toString() ? `?${params.toString()}` : '';
  return await request<AlertResponse[]>(`/api/alerts${query}`);
};

export const updateTariff = async (tariff: Partial<TariffEntry>) => {
  const body = {
    parkId: tariff.parqueId,
    pricePerHour: tariff.tarifaHora ?? 0,
    maxDaily: tariff.maxDiario ?? 0,
    monthlyPrice: tariff.mensalidade ?? 0,
    pricePerKwh: tariff.tarifaEV ?? 0,
    status: 'ACTIVE',
  };
  return await request<TariffResponse>('/api/manager/tariffs', {
    method: 'PUT',
    body: JSON.stringify(body)
  });
};

export const updateAlertState = async (alertId: string, state: string) => {
  await request(`/api/alerts/${alertId}/state`, {
    method: 'PATCH',
    body: JSON.stringify({ state: state.toUpperCase().replace('-', '_') })
  });
};
