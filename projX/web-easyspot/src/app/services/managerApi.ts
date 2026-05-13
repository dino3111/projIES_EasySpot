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
  photoUrl: string | null;
  severity: string;
  state: string;
  createdAt: string;
  reportedBy: string | null;
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

export interface BillingSessionResponse {
  id: string;
  parkName: string;
  entryTime: string;
  exitTime: string;
  durationMinutes: number;
  licensePlate: string | null;
  zoneType: string;
  parkingRevenue: number;
  evRevenue: number;
  total: number;
}

export const fetchManagerBilling = async (parkId?: string, days = 2, page = 0, pageSize = 20) => {
  const params = new URLSearchParams({ days: String(days), page: String(page), size: String(pageSize) });
  if (parkId) params.append('parkId', parkId);
  const response = await request<Page<BillingSessionResponse>>(`/api/manager/billing?${params.toString()}`);
  return response;
};

export interface TechnicianSummary {
  id: string;
  name: string;
  email: string;
}

export interface CreateParkPayload {
  name: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  openingHours: string;
  totalSpaces: number;
  technicianId: string | null;
}

export interface ParkLayoutSpotPayload {
  spotNumber: string;
  zone: 'STANDARD' | 'EV' | 'ACCESSIBLE' | 'RESERVED';
  row: number;
  col: number;
  status?: string;
}

export interface ParkLayoutEvChargerPayload {
  type: string;
  speed: string;
  pricePerKwh: number;
  available?: boolean;
}

export interface ParkLayoutAccessiblePayload {
  location: string;
  available?: boolean;
  distanceToEntranceMeters?: number;
  baySize?: string;
  monitored?: boolean;
  hasRampSpace?: boolean;
  sensorStatus?: string;
  ledStatus?: string;
}

export interface ConfigureParkLayoutPayload {
  amenities: string[];
  spots: ParkLayoutSpotPayload[];
  evChargers: ParkLayoutEvChargerPayload[];
  accessibleSpots: ParkLayoutAccessiblePayload[];
}

export interface CreateTechnicianPayload {
  username: string;
  name: string;
  email: string;
  temporaryPassword: string;
  parkIds: string[];
}

export interface TechnicianDetail extends TechnicianSummary {
  username: string;
  parkIds: string[];
}

export const fetchTechnicians = () =>
  request<TechnicianSummary[]>('/api/manager/technicians');

export const createTechnician = (payload: CreateTechnicianPayload) =>
  request<TechnicianDetail>('/api/manager/technicians', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const createPark = (payload: CreateParkPayload) =>
  request<{ id: string }>('/api/manager/parks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const configureParkLayout = (parkId: string, payload: ConfigureParkLayoutPayload) =>
  request<{ id: string }>(`/api/manager/parks/${parkId}/layout`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export interface ParkAssignment {
  parkId: string;
  technicians: TechnicianSummary[];
}

export const fetchParkAssignments = () =>
  request<ParkAssignment[]>('/api/manager/parks/assignments');

export const assignTechnicianToPark = (parkId: string, technicianId: string) =>
  request<void>(`/api/manager/parks/${parkId}/technician/${technicianId}`, { method: 'PUT' });

export const removeTechnicianFromPark = (parkId: string, technicianId: string) =>
  request<void>(`/api/manager/parks/${parkId}/technician/${technicianId}`, { method: 'DELETE' });
