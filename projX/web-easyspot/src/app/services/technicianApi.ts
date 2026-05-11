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

export const updateSensorStatus = (sensorId: string, status: string, notes?: string): Promise<void> =>
  request<void>(`/api/technician/sensors/${encodeURIComponent(sensorId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, notes: notes ?? null }),
  });

interface AlertResponseDto {
  id: string;
  type: string;
  park: string;
  zone: string | null;
  spotNumber: string | null;
  sensorId: string | null;
  plate: string | null;
  description: string;
  severity: string;
  state: string;
  createdAt: string;
  attributedTo: string | null;
  notes: string | null;
}

function alertToIssue(a: AlertResponseDto): IssueReport {
  const tipo: IssueReport['tipo'] =
    a.type === 'SENSOR' ? 'sensor' : a.type === 'SYSTEM' ? 'sistema' : 'cliente';
  const severidade: IssueReport['severidade'] =
    a.severity === 'CRITICAL' ? 'critica' : a.severity === 'WARNING' ? 'aviso' : 'info';
  const estado: IssueReport['estado'] =
    a.state === 'OPEN' ? 'aberto' : a.state === 'IN_PROGRESS' ? 'em-progresso' : 'resolvido';
  return {
    id: a.id,
    tipo,
    parque: a.park,
    zona: a.zone ?? undefined,
    sensorId: a.sensorId ?? undefined,
    matricula: a.plate ?? undefined,
    descricao: a.description,
    severidade,
    estado,
    criadoEm: a.createdAt,
    atribuidoA: a.attributedTo ?? undefined,
    notas: a.notes ?? undefined,
  };
}

export const fetchAlerts = async (params?: { state?: string; parkId?: string }): Promise<IssueReport[]> => {
  const qs = new URLSearchParams();
  if (params?.state) qs.set('state', params.state);
  if (params?.parkId) qs.set('parkId', params.parkId);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  const data = await request<AlertResponseDto[]>(`/api/alerts${query}`);
  return data.map(alertToIssue);
};
