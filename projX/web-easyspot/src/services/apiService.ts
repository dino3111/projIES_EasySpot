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
  return text ? (JSON.parse(text) as T) : (undefined as T);
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
    request<VehicleResponse>('/api/vehicles', { method: 'POST', body: JSON.stringify(body) }),
  remove: (id: string) => request<void>(`/api/vehicles/${id}`, { method: 'DELETE' }),
};

export const paymentApi = {
  createSetupIntent: () => request<string>('/api/payments/setup-intent', { method: 'POST' }),
};
