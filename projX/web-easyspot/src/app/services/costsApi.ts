import { API_BASE } from '../../services/apiBase';
import { getAccessToken } from './authToken';
import { withGlobalLoading } from '../context/LoadingContext';

export interface SpendingTotals {
  totalSpent: number;
  avgPerSession: number;
  parkingSpent: number;
  chargingSpent: number;
}

export interface SpendingInsights {
  mostUsedPark: string | null;
  costliestSession: {
    parkName: string;
    date: string;
    vehicle: string | null;
    totalSpent: number;
  } | null;
  sessionCount: number;
}

export interface SpendingTimeseriesPoint {
  date: string;
  totalSpent: number;
}

export interface SpendingBreakdown {
  id: string;
  name: string;
  totalSpent: number;
}

export interface SpendingHistoryItem {
  parkName: string;
  date: string;
  durationMinutes: number;
  vehicle: string | null;
  totalSpent: number;
  status: string;
}

export interface DriverSpendingResponse {
  totals: SpendingTotals;
  insights: SpendingInsights;
  timeseries: SpendingTimeseriesPoint[];
  breakdownByPark: SpendingBreakdown[];
  breakdownByVehicle: SpendingBreakdown[];
  history: SpendingHistoryItem[];
}

export interface PlanningRecommendation {
  id: string;
  name: string;
  address: string;
  openingHours: string;
  distanceMeters: number;
  pricePerHour: number;
  currentOccupancy: {
    occupied: number;
    total: number;
    occupancyPercent: number;
    status: string;
  };
  occupancyByHour: Array<{ hour: string; occupancyPercent: number }>;
}

export interface PlanningResponse {
  recommendations: PlanningRecommendation[];
}

export type SpendingTimeWindow = '7D' | '30D' | '3M' | '6M' | '12M';

export interface SpendingQuery {
  vehicleId?: string | null;
  timeWindow?: SpendingTimeWindow;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

export interface PlanningQuery {
  city: string;
  durationMinutes: number;
  isElectric?: boolean;
  isAccessible?: boolean;
  maxDistanceMeters?: number;
  lat: number;
  lng: number;
  orderBy?: 'price' | 'distance' | 'ratio';
}

export async function fetchDriverSpending(query: SpendingQuery = {}): Promise<DriverSpendingResponse> {
  const params = new URLSearchParams();
  if (query.vehicleId) params.set('vehicleId', query.vehicleId);
  if (query.timeWindow) params.set('timeWindow', query.timeWindow);
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.page !== undefined) params.set('historyPage', String(query.page));
  if (query.size !== undefined) params.set('historySize', String(query.size));

  const token = getAccessToken();
  const resp = await withGlobalLoading(() => fetch(`${API_BASE}/api/driver/costs/spending?${params.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  }));

  if (!resp.ok) throw new Error(`Failed to fetch spending data (${resp.status})`);
  return (await resp.json()) as DriverSpendingResponse;
}

export async function fetchParkingPlanning(query: PlanningQuery): Promise<PlanningResponse> {
  const params = new URLSearchParams({
    city: query.city,
    estimatedDurationMinutes: String(query.durationMinutes),
    lat: String(query.lat),
    lng: String(query.lng),
  });

  if (query.isElectric !== undefined) params.set('isElectric', String(query.isElectric));
  if (query.isAccessible !== undefined) params.set('isAccessible', String(query.isAccessible));
  if (query.maxDistanceMeters !== undefined) params.set('maxDistanceMeters', String(query.maxDistanceMeters));
  if (query.orderBy) params.set('orderBy', query.orderBy.toUpperCase());

  const token = getAccessToken();
  const resp = await withGlobalLoading(() => fetch(`${API_BASE}/api/driver/costs/planning?${params.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  }));

  if (!resp.ok) throw new Error(`Failed to fetch planning data (${resp.status})`);
  return (await resp.json()) as PlanningResponse;
}
