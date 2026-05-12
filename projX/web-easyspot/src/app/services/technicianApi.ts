import { request } from '../../services/apiService';
import type { IssueReport } from '../data/gestorData';

// ── Types matching backend DTOs ────────────────────────────────────────────────

export type SensorStatus = 'operational' | 'degraded' | 'offline' | 'maintenance';

export type { IssueReport };

export interface SensorSummary {
  sensorId: string;
  parkingLotId: string;
  parkingLotName: string;
  parkingLotCity: string;
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

// ── Alert / Issue types (matching backend AlertResponse DTO) ──────────────────

export type AlertState    = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';
export type AlertType     = 'SENSOR' | 'CLIENT' | 'SYSTEM';

export interface AlertResponse {
  id: string;
  type: AlertType;
  park: string;
  zone: string | null;
  spotNumber: string | null;
  sensorId: string | null;
  plate: string | null;
  description: string;
  severity: AlertSeverity;
  state: AlertState;
  createdAt: string;
  attributedTo: string | null;
  notes: string | null;
}

// ── API functions (use shared apiService.request — handles auth, 401, loading) ──

export const fetchTechnicianDashboard = (): Promise<TechnicianDashboard> =>
  request<TechnicianDashboard>('/api/technician/dashboard');

export const fetchSensorList = (): Promise<SensorSummary[]> =>
  request<SensorSummary[]>('/api/technician/sensors');

export const fetchSensorDetail = (sensorId: string): Promise<SensorDetail> =>
  request<SensorDetail>(`/api/technician/sensors/${encodeURIComponent(sensorId)}/logs`);

export const updateAlertState = (alertId: string, state: AlertState, notes?: string): Promise<void> =>
  request<void>(`/api/alerts/${alertId}/state`, {
    method: 'PATCH',
    body: JSON.stringify({ state, notes }),
  });

export const createSensorTaskAlert = (sensorId: string, notes?: string): Promise<AlertResponse> =>
  request<AlertResponse>(`/api/alerts/sensor-tasks/${encodeURIComponent(sensorId)}`, {
    method: 'POST',
    body: JSON.stringify({ notes: notes ?? null }),
  });

export const updateSensorStatus = (sensorId: string, status: string, notes?: string): Promise<void> =>
  request<void>(`/api/technician/sensors/${encodeURIComponent(sensorId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, notes: notes ?? null }),
  });

export type FetchAlertsQuery = {
  parkId?: string;
  state?: AlertState;
  severity?: AlertSeverity;
};

export const fetchAlerts = (query: FetchAlertsQuery = {}): Promise<AlertResponse[]> => {
  const params = new URLSearchParams();
  if (query.parkId)   params.set('parkId',   query.parkId);
  if (query.state)    params.set('state',    query.state);
  if (query.severity) params.set('severity', query.severity);
  const qs = params.toString();
  return request<AlertResponse[]>(`/api/alerts${qs ? `?${qs}` : ''}`);
};

export interface AssignedPark {
  assignmentId: string;
  technicianId: string;
  parkingLotId: string;
  parkingLotName: string;
  parkingLotCity: string;
}

export const fetchMyAssignedParks = (): Promise<AssignedPark[]> =>
  request<AssignedPark[]>('/api/technician/parks/my');
