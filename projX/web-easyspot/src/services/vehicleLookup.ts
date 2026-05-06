import { API_BASE } from './apiBase';

export interface VehicleData {
  plate?: string;
  vin?: string;
  make?: string;
  model?: string;
  version?: string;
  plateDate?: string;
  yearFrom?: number;
  yearTo?: number;
  color?: string;
  fuelType?: string;
  displacementCc?: number;
  cubicCap?: string;
  powerCv?: number;
  powerKw?: number;
  powercv?: string;
  powerkw?: string;
  co2?: string;
  bodyType?: string;
  driveType?: string;
  categoryType?: string;
  ownerType?: string;
  ownerCategory?: string;
  categoryIUC?: string;
  isImported?: string;
  IUC?: string;
  [key: string]: unknown;
}

export interface InsuranceData {
  entity?: string;
  policy?: string;
  startDate?: string;
  endDate?: string;
  license?: string;
  logo?: string;
}

const LOOKUP_ENDPOINT = `${API_BASE}/api/vehicles/lookup`;

function buildAuthHeaders(): Record<string, string> {
  const accessToken = sessionStorage.getItem('es_access_token');
  if (!accessToken) throw new Error('Sessão expirada. Inicie sessão novamente.');
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

async function errorFromResponse(response: Response): Promise<Error> {
  const body = await response.text().catch(() => '');
  console.warn('[InfoMatricula][Lookup] non-ok response body', {
    status: response.status,
    body: body.slice(0, 500),
  });

  if (response.status === 404) return new Error('Matricula nao encontrada na base de dados.');
  if (response.status === 429) return new Error('Demasiados pedidos. Aguarde um momento.');
  if (response.status === 401 || response.status === 403) {
    return new Error('Autorizacao negada pelo servico de matriculas.');
  }
  return new Error(`Erro ${response.status}: nao foi possivel obter dados do veiculo.`);
}

export async function lookupVehicleData(plate: string): Promise<VehicleData> {
  const endpoint = `${LOOKUP_ENDPOINT}?plate=${encodeURIComponent(plate.toUpperCase())}`;
  const response = await fetch(endpoint, { headers: buildAuthHeaders() });
  if (!response.ok) throw await errorFromResponse(response);
  return await response.json() as VehicleData;
}

export async function lookupInsuranceData(plate: string): Promise<InsuranceData | null> {
  void plate;
  return null;
}
