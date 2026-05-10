import { request } from '../../services/apiService';
import type { TariffEntry, IssueReport } from '../data/gestorData';

export interface TariffResponse {
  id: string;
  parkId: string;
  parkName: string;
  city: string;
  pricePerHour: number;
  maxDaily: number;
  monthlyPrice: number;
  pricePerKwh: number;
  status: 'ACTIVE' | 'REVIEW' | 'SUSPENDED';
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
    pricePerHour: tariff.tarifaHora,
    maxDaily: tariff.maxDiario,
    monthlyPrice: tariff.mensalidade,
    pricePerKwh: tariff.tarifaEV,
    status: tariff.estado?.toUpperCase()
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
