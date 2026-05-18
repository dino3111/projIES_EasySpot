import { API_BASE } from './apiBase';
import { withGlobalLoading } from '../app/context/LoadingContext';
import { getAccessToken } from '../app/services/authToken';
const AUTH_STORAGE_KEYS = ['es_access_token', 'es_id_token', 'es_refresh_token', 'es_pkce_verifier', 'es_pkce_state'] as const;
const RECENT_AUTH_TS_KEY = 'es_recent_auth_ts';
const RECENT_AUTH_WINDOW_MS = 15_000;
const RETRYABLE_STATUSES = new Set([502, 503, 504]);
const RETRY_DELAY_MS = 700;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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

function isWithinRecentAuthWindow(): boolean {
  const raw = sessionStorage.getItem(RECENT_AUTH_TS_KEY);
  if (!raw) return false;
  const ts = Number(raw);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts <= RECENT_AUTH_WINDOW_MS;
}

function parseErrorMessage(text: string, status: number): string {
  const trimmed = text.trim();
  const isHtmlError = trimmed.startsWith('<!DOCTYPE html') || trimmed.startsWith('<html');

  if (isHtmlError) {
    if (RETRYABLE_STATUSES.has(status)) {
      return 'Serviço temporariamente indisponível. Tente novamente em alguns segundos.';
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
  if (isWithinRecentAuthWindow()) {
    // Right after a fresh login/registration, backend sync can briefly return 401.
    // Avoid forcing a global logout in this transient window.
    throw new Error('A conta está a ser sincronizada. Tente novamente em alguns segundos.');
  }
  clearAuthStorage();
  redirectToWelcomeIfNeeded();
  throw new Error('Sessão expirada ou inválida. Por favor, tente entrar novamente.');
}

function throwHttpError(status: number, text: string): never {
  const fallbackMessage = `HTTP ${status}`;
  const errorMessage = text ? parseErrorMessage(text, status) : fallbackMessage;
  throw new Error(errorMessage);
}

function canRetry(method: string, attempt: number): boolean {
  return attempt < 2 && (method === 'GET' || method === 'HEAD');
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
  let res: Response | null = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      res = await withGlobalLoading(() => fetch(url, { ...options, headers }));
      if (!RETRYABLE_STATUSES.has(res.status) || !canRetry(method, attempt)) {
        break;
      }
    } catch (error) {
      if (!canRetry(method, attempt)) throw error;
    }

    await sleep(RETRY_DELAY_MS);
  }

  if (!res) {
    throw new Error('Serviço temporariamente indisponível. Tente novamente em alguns segundos.');
  }

  if (!res.ok) {
    if (res.status === Number(401)) {
      console.warn('[API-401]', method, url, 'bearer:', token ? 'yes' : 'no');
      if (!token) {
        // Race condition during auth init — no token was sent, skip redirect
        throw new Error('Sessão expirada ou inválida. Por favor, tente entrar novamente.');
      }
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
  driverTypes?: Array<'regular' | 'ev' | 'reduced_mobility'>;
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
  driverTypes?: Array<'regular' | 'ev' | 'reduced_mobility'>;
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

export interface ReportResponse {
  id: string;
  type: string;
  parkId: string;
  parkName: string;
  zone: string;
  spotNumber: string;
  plate: string | null;
  description: string;
  photoUrl: string | null;
  severity: string;
  state: string;
  createdAt: string;
}

export const reportApi = {
  submit: async (params: {
    parkingLotId: string;
    zone: string;
    spotNumber: string;
    violationType: string;
    vehiclePlate?: string;
    description: string;
    photo?: File | null;
  }): Promise<ReportResponse> => {
    const token = getAccessToken();
    const formData = new FormData();
    formData.append('parkingLotId', params.parkingLotId);
    formData.append('zone', params.zone);
    formData.append('spotNumber', params.spotNumber);
    formData.append('violationType', params.violationType);
    if (params.vehiclePlate) formData.append('vehiclePlate', params.vehiclePlate);
    formData.append('description', params.description);
    if (params.photo) formData.append('photo', params.photo);

    const res = await withGlobalLoading(() =>
      fetch(`${API_BASE}/api/reports`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      }),
    );
    if (!res.ok) {
      if (res.status === Number(401)) throwUnauthorizedError();
      const errorText = await readErrorBody(res);
      throwHttpError(res.status, errorText);
    }
    return await res.json() as ReportResponse;
  },
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

export interface ParkSummary {
  id: string;
  name: string;
  city: string;
  address: string;
}

export const parksApi = {
  list: (pageSize = 100) =>
    request<{ items: ParkSummary[] }>(`/api/parks/list?page=1&pageSize=${pageSize}`),
};
