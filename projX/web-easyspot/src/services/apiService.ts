const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

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
    const text = await res.text().catch(() => '');
    let errorMessage = `HTTP ${res.status}`;
    if (text) {
      try {
        const json = JSON.parse(text);
        if (json.detail) errorMessage = json.detail;
        else if (json.message) errorMessage = json.message;
        else errorMessage = text;
      } catch (e) {
        errorMessage = text;
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
};

export const profileApi = {
  get: () => request<DriverProfileResponse>('/api/profile'),
  update: (body: ProfileUpdateRequest) =>
    request<DriverProfileResponse>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
};
