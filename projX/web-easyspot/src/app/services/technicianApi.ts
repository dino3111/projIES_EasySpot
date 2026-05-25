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
  notes?: string | null;
}

export interface TechnicianDashboard {
  kpis: TechnicianKpiSummary;
  uptimeLast7Days: DailyUptime[];
  sensorDistribution: SensorStatusDistribution[];
  urgentWorkOrders: WorkOrder[];
}

type FetchOptions = {
  background?: boolean;
};

const requestMaybeBackground = <T,>(path: string, options: FetchOptions = {}) =>
  options.background ? request<T>(path, { background: true }) : request<T>(path);

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

export const fetchTechnicianDashboard = (options: FetchOptions = {}): Promise<TechnicianDashboard> =>
  requestMaybeBackground<TechnicianDashboard>('/api/technician/dashboard', options).then((data) => {
    console.info('[TECH-FE] dashboard loaded', {
      totalSensors: data.kpis.totalSensors,
      operationalSensors: data.kpis.operationalSensors,
      urgentWorkOrders: data.urgentWorkOrders.length,
      distribution: data.sensorDistribution.length,
    });
    return data;
  });

export const fetchSensorList = (options: FetchOptions = {}): Promise<SensorSummary[]> =>
  requestMaybeBackground<SensorSummary[]>('/api/technician/sensors', options).then((data) => {
    console.info('[TECH-FE] sensors loaded', {
      count: data.length,
      parkIds: [...new Set(data.map((s) => s.parkingLotId))],
    });
    return data;
  });

export const fetchSensorDetail = (sensorId: string): Promise<SensorDetail> =>
  request<SensorDetail>(`/api/technician/sensors/${encodeURIComponent(sensorId)}/logs`);

export const updateAlertState = (alertId: string, state: AlertState, notes?: string): Promise<void> =>
  request<void>(`/api/alerts/${alertId}/state`, {
    method: 'PATCH',
    body: JSON.stringify({ state, notes }),
  });

export const createSensorTaskAlert = (sensorId: string, notes?: string, severity?: AlertSeverity): Promise<AlertResponse> =>
  request<AlertResponse>(`/api/alerts/sensor-tasks/${encodeURIComponent(sensorId)}`, {
    method: 'POST',
    body: JSON.stringify({ notes: notes ?? null, severity: severity ?? null }),
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
  from?: string;
  to?: string;
};

export const fetchAlerts = (query: FetchAlertsQuery = {}, options: FetchOptions = {}): Promise<AlertResponse[]> => {
  const params = new URLSearchParams();
  if (query.parkId)   params.set('parkId',   query.parkId);
  if (query.state)    params.set('state',    query.state);
  if (query.severity) params.set('severity', query.severity);
  if (query.from)     params.set('from',     query.from);
  if (query.to)       params.set('to',       query.to);
  const qs = params.toString();
  return request<AlertResponse[] | { content: AlertResponse[] }>(`/api/alerts${qs ? `?${qs}` : ''}`, {
    background: options.background,
  }).then((data) => {
    const alerts = Array.isArray(data) ? data : data.content;
    console.info('[TECH-FE] alerts loaded', { count: alerts.length, query });
    return alerts;
  });
};

export interface AssignedPark {
  assignmentId: string;
  technicianId: string;
  parkingLotId: string;
  parkingLotName: string;
  parkingLotCity: string;
}

export const fetchMyAssignedParks = (): Promise<AssignedPark[]> =>
  request<AssignedPark[]>('/api/technician/parks/my').then((data) => {
    console.info('[TECH-FE] assigned parks loaded', {
      count: data.length,
      parkIds: data.map((p) => p.parkingLotId),
    });
    return data;
  });
