import { API_BASE } from './apiBase';
const AUTH_STORAGE_KEYS = ['es_access_token', 'es_id_token', 'es_refresh_token', 'es_pkce_verifier', 'es_pkce_state'] as const;

function getAccessToken(): string | null {
  return sessionStorage.getItem('es_access_token');
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    if (res.status === 401) {
      for (const key of AUTH_STORAGE_KEYS) sessionStorage.removeItem(key);
      if (typeof window !== 'undefined' && window.location.pathname !== '/welcome') {
        window.location.href = '/welcome?session=expired';
      }
      throw new Error('Sessão expirada. Inicie sessão novamente.');
    }

    const text = await res.text().catch(() => '');
    let errorMessage = `HTTP ${res.status}`;
    const isHtmlError = text.trim().startsWith('<!DOCTYPE html') || text.trim().startsWith('<html');
    if (text) {
      if (!isHtmlError) {
        try {
          const json = JSON.parse(text);
          if (json.detail) errorMessage = json.detail;
          else if (json.message) errorMessage = json.message;
          else errorMessage = text;
        } catch (e) {
          errorMessage = text;
        }
      } else if (res.status === 502) {
        errorMessage = 'Serviço de pagamentos temporariamente indisponível (502). Tente novamente em alguns segundos.';
      } else {
        errorMessage = `Erro de servidor (${res.status}).`;
      }
    }
    throw new Error(errorMessage);
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

export interface DriverProfileResponse {
  name: string;
  email: string;
  role: string;
  photoUrl: string | null;
  driverType: 'regular' | 'ev' | 'reduced_mobility' | null;
  notificationsEnabled: boolean;
  pushNotificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  spending: unknown;
  favoritesCount: number;
}

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
  remove: (id: string) => request<void>(`/api/vehicles/${id}`, { method: 'DELETE' }),
};

export const paymentApi = {
  createSetupIntent: () => request<string>('/api/payments/setup-intent', { method: 'POST' }),
  getSetupStatus: () => request<PaymentSetupStatusResponse>('/api/payments/setup-status'),
  listMethods: () => request<PaymentMethodSummaryResponse[]>('/api/payments/methods'),
  removeMethod: (paymentMethodId: string) =>
    request<void>(`/api/payments/methods/${paymentMethodId}`, { method: 'DELETE' }),
  createCustomerPortalSession: () => request<string>('/api/payments/customer-portal'),
};

export const profileApi = {
  get: () => request<DriverProfileResponse>('/api/profile'),
  update: (body: ProfileUpdateRequest) =>
    request<DriverProfileResponse>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
};
