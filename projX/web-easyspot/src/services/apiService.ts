import { API_BASE } from './apiBase';
import { withGlobalLoading } from '../app/context/LoadingContext';
const AUTH_STORAGE_KEYS = ['es_access_token', 'es_id_token', 'es_refresh_token', 'es_pkce_verifier', 'es_pkce_state'] as const;

function getAccessToken(): string | null {
  return sessionStorage.getItem('es_access_token');
}

function clearAuthStorage() {
  for (const key of AUTH_STORAGE_KEYS) sessionStorage.removeItem(key);
}

function redirectToWelcomeIfNeeded() {
  if (typeof globalThis === 'undefined') return;
  const maybeLocation = (globalThis as { location?: Location }).location;
  if (!maybeLocation || maybeLocation.pathname === '/welcome') return;
  maybeLocation.href = '/welcome?session=expired';
}

function parseErrorMessage(text: string, status: number): string {
  const trimmed = text.trim();
  const isHtmlError = trimmed.startsWith('<!DOCTYPE html') || trimmed.startsWith('<html');

  if (isHtmlError) {
    if (status === 502) {
      return 'Serviço de pagamentos temporariamente indisponível (502). Tente novamente em alguns segundos.';
    }
    return `Erro de servidor (${status}).`;
  }

  try {
    const json = JSON.parse(text) as { detail?: string; message?: string };
    return json.detail ?? json.message ?? text;
  } catch {
    return text;
  }
}

async function readErrorBody(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return `Não foi possível ler o corpo da resposta (${errMsg}).`;
  }
}

function throwUnauthorizedError(): never {
  clearAuthStorage();
  redirectToWelcomeIfNeeded();
  throw new Error('Sessão expirada ou inválida. Por favor, tente entrar novamente.');
}

function throwHttpError(status: number, text: string): never {
  const fallbackMessage = `HTTP ${status}`;
  const errorMessage = text ? parseErrorMessage(text, status) : fallbackMessage;
  throw new Error(errorMessage);
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const method = options.method ?? 'GET';
  const url = `${API_BASE}${path}`;
  const res = await withGlobalLoading(() => fetch(url, { ...options, headers }));

  if (!res.ok) {
    if (res.status === Number(401)) {
      console.warn('[API-401]', method, url, 'bearer:', token ? 'yes' : 'no');
      throwUnauthorizedError();
    }
    const errorText = await readErrorBody(res);
    console.warn('[API-ERR]', method, url, 'status:', res.status, 'body:', errorText.slice(0, 500));
    throwHttpError(res.status, errorText);
  }

  const text = await res.text();
  if (!text) return undefined as T;

  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return JSON.parse(text) as T;
  }

  return text as T;
}

export interface VehicleResponse {
  id: string;
  plate: string;
  make: string | null;
  model: string | null;
  version: string | null;
  color: string | null;
  year: number;
  fuelType: string | null;
  powerKW: number | null;
  nickname: string | null;
  isEv: boolean;
  isAccessible: boolean;
  isPrimary: boolean;
}

export interface VehicleLookupResponse {
  plate?: string;
  vin?: string;
  make?: string;
  model?: string;
  version?: string;
  plateDate?: string;
  color?: string;
  fuelType?: string;
  categoryType?: string;
}

export interface PaymentSetupStatusResponse {
  configured: boolean;
}

export interface PaymentMethodSummaryResponse {
  id: string;
  type: string;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  isDefault: boolean;
}

export interface SpendingSummaryResponse {
  totalEuros: number;
  sessionCount: number;
  avgEuros: number;
}

interface BaseProfileResponse {
  name: string;
  email: string;
  role: 'DRIVER' | 'MANAGER' | 'TECHNICAL';
  photoUrl: string | null;
  notificationsEnabled: boolean;
}

export interface DriverProfileResponse extends BaseProfileResponse {
  role: 'DRIVER';
  driverType: 'regular' | 'ev' | 'reduced_mobility' | null;
  pushNotificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  spending: SpendingSummaryResponse;
  favoritesCount: number;
}

export interface ManagerProfileResponse extends BaseProfileResponse {
  role: 'MANAGER';
  managedParks: number;
  todayRevenue: number;
  todayVehicles: number;
  openAlerts: number;
}

export interface TechnicianProfileResponse extends BaseProfileResponse {
  role: 'TECHNICAL';
  assignedTasks: number;
  sensorSummary: {
    total: number;
    operational: number;
    uptimePct: number;
  };
  openFaults: number;
}

export type ProfileResponse = DriverProfileResponse | ManagerProfileResponse | TechnicianProfileResponse;

export interface ProfileUpdateRequest {
  driverType?: 'regular' | 'ev' | 'reduced_mobility' | null;
  notificationsEnabled?: boolean;
  pushNotificationsEnabled?: boolean;
  emailNotificationsEnabled?: boolean;
  photoUrl?: string | null;
}

export interface InsuranceLookupResponse {
  entity?: string;
  policy?: string;
  endDate?: string;
  startDate?: string;
  license?: string;
  logo?: string;
}

export interface VehicleCreateRequest {
  licensePlate: string;
  externalIdentifier?: string;
  nickname?: string;
  isAccessible?: boolean;
  isPrimary?: boolean;
  chargerTypes?: string[];
  make?: string;
  model?: string;
  fuelType?: string;
  year?: number;
}

export const vehicleApi = {
  list: () => request<VehicleResponse[]>('/api/vehicles'),
  create: (body: VehicleCreateRequest) =>
    request<VehicleResponse>('/api/vehicles', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  remove: (id: string) => request<undefined>(`/api/vehicles/${id}`, { method: 'DELETE' }),
};

export const paymentApi = {
  createSetupIntent: () => request<string>('/api/payments/setup-intent', { method: 'POST' }),
  getSetupStatus: () => request<PaymentSetupStatusResponse>('/api/payments/setup-status'),
  listMethods: () => request<PaymentMethodSummaryResponse[]>('/api/payments/methods'),
  removeMethod: (paymentMethodId: string) =>
    request<undefined>(`/api/payments/methods/${paymentMethodId}`, { method: 'DELETE' }),
  createCustomerPortalSession: () => request<string>('/api/payments/customer-portal'),
};

export const profileApi = {
  get: () => request<ProfileResponse>('/api/profile'),
  update: (body: ProfileUpdateRequest) =>
    request<ProfileResponse>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  uploadPhoto: async (file: File): Promise<ProfileResponse> => {
    const token = getAccessToken();
    const formData = new FormData();
    formData.append('photo', file);
    const res = await withGlobalLoading(() => fetch(`${API_BASE}/api/profile/photo`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    }));
    if (!res.ok) {
      if (res.status === Number(401)) throwUnauthorizedError();
      const errorText = await readErrorBody(res);
      throwHttpError(res.status, errorText);
    }
    return await res.json() as ProfileResponse;
  },
};
