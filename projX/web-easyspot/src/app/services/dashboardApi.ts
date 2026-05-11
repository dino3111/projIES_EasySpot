import { request } from '../../services/apiService';

export interface KpiSummary {
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

export interface DailyMetric {
  date: string;
  day: string;
  entrances: number;
  earnings: number;
}

export interface ZoneOccupancy {
  name: string;
  type: string;
  total: number;
  occupied: number;
}

export interface HourlyOccupancy {
  time: string;
  occupancy: number;
}

export interface AlertSummary {
  id: string;
  type: string;
  park: string;
  zone: string | null;
  sensorId: string | null;
  plate: string | null;
  description: string;
  severity: string;
  state: string;
  createdAt: string;
  attributedTo: string | null;
  notes: string | null;
}

export interface ParkSummary {
  name: string;
  city: string;
  entrances: number;
  occupancyPercentage: number;
  earnings: number;
}

export interface ManagerDashboardResponse {
  kpis: KpiSummary;
  seriesLast7Days: DailyMetric[];
  occupancyPerZone: ZoneOccupancy[];
  occupancyPerHour: HourlyOccupancy[];
  lastAlerts: AlertSummary[];
  performancePerPark: ParkSummary[];
}

export const ZONE_COLORS: Record<string, string> = {
  standard: '#7357ec',
  ev: '#22c55e',
  accessible: '#3b82f6',
  reserved: '#f59e0b',
};

export const dashboardApi = {
  getManagerDashboard: () => request<ManagerDashboardResponse>('/api/manager/dashboard'),
};
