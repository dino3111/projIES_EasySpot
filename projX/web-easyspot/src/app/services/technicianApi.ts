import { request } from '../../services/apiService';

// ── Types matching backend DTOs ────────────────────────────────────────────────

export type SensorStatus = 'operational' | 'degraded' | 'offline';

export interface SensorSummary {
  sensorId: string;
  parkingLotId: string;
  parkingLotName: string;
  zone: string;
  status: SensorStatus;
  lastSeenAt: string;
  createdAt: string;
}

export interface SensorLogEntry {
  alertId: string;
  type: string;
  severity: string;
  state: string;
  description: string;
  createdAt: string;
  resolvedAt: string | null;
}

export interface SensorDetail extends SensorSummary {
  logs: SensorLogEntry[];
}

export interface TechnicianKpiSummary {
  totalSensors: number;
  operationalSensors: number;
  uptimePct: number;
  failuresToday: number;
  failuresTodayVariancePct: number;
  meanTimeToRepair: string;
  mttrVariancePct: number;
}

export interface DailyUptime {
  date: string;
  day: string;
  uptimePct: number;
}

export interface SensorStatusDistribution {
  status: string;
  label: string;
  count: number;
  percentage: number;
}

export interface WorkOrder {
  id: string;
  type: string;
  park: string;
  zone: string;
  sensorId: string | null;
  description: string;
  severity: string;
  state: string;
  createdAt: string;
  attributedTo: string | null;
}

export interface TechnicianDashboard {
  kpis: TechnicianKpiSummary;
  uptimeLast7Days: DailyUptime[];
  sensorDistribution: SensorStatusDistribution[];
  urgentWorkOrders: WorkOrder[];
}

// ── API functions (use shared apiService.request — handles auth, 401, loading) ──

export const fetchTechnicianDashboard = (): Promise<TechnicianDashboard> =>
  request<TechnicianDashboard>('/api/technician/dashboard');

export const fetchSensorList = (): Promise<SensorSummary[]> =>
  request<SensorSummary[]>('/api/technician/sensors');

export const fetchSensorDetail = (sensorId: string): Promise<SensorDetail> =>
  request<SensorDetail>(`/api/technician/sensors/${encodeURIComponent(sensorId)}/logs`);

export const updateAlertState = (alertId: string, state: string): Promise<void> =>
  request<void>(`/api/alerts/${alertId}/state`, {
    method: 'PATCH',
    body: JSON.stringify({ state }),
  });
