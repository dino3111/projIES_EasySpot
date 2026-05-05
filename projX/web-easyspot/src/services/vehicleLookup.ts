import { getAppCheckToken, getFirebaseIdToken } from './firebaseAppCheck';

export interface VehicleData {
  plate?: string;
  vin?: string;
  make?: string;
  model?: string;
  version?: string;
  plateDate?: string;
  color?: string;
  fuelType?: string;
  cubicCap?: string;
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

const IMT_PROXY_BASE = '/infomatricula';
const RETRYABLE_STATUSES = new Set([502, 503, 504]);
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function imtHeaders(): Promise<Record<string, string>> {
  const idToken = await getFirebaseIdToken();
  const appCheckToken = await getAppCheckToken();

  console.debug('[InfoMatricula][Lookup] auth headers ready', {
    appCheckLength: appCheckToken.length,
    idTokenLength: idToken.length,
  });

  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${idToken}`,
    'X-Firebase-AppCheck': appCheckToken,
  };
}

async function fetchWithAuth(endpoint: string): Promise<Response> {
  console.info('[InfoMatricula][Lookup] request start', { endpoint });
  const headers = await imtHeaders();
  const response = await fetch(endpoint, { headers });

  console.info('[InfoMatricula][Lookup] response', {
    endpoint,
    status: response.status,
    contentType: response.headers.get('content-type'),
    rateLimitRemaining: response.headers.get('ratelimit-remaining'),
  });

  return response;
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
  const endpoint = `${IMT_PROXY_BASE}/informacao/fetch?plate=${encodeURIComponent(plate.toUpperCase())}`;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    console.info('[InfoMatricula][Vehicle] lookup attempt', { plate, attempt: attempt + 1 });
    const response = await fetchWithAuth(endpoint);

    if (response.ok) {
      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        throw new Error('Resposta invalida da API (esperado JSON).');
      }
      const data = await response.json() as VehicleData;
      console.info('[InfoMatricula][Vehicle] lookup success', {
        plate,
        hasPlate: Boolean(data.plate),
        make: data.make,
        model: data.model,
      });
      return data;
    }

    if (RETRYABLE_STATUSES.has(response.status) && attempt < 2) {
      await delay((attempt + 1) * 700);
      continue;
    }

    throw await errorFromResponse(response);
  }

  throw new Error('Servico de matriculas indisponivel de momento.');
}

export async function lookupInsuranceData(plate: string): Promise<InsuranceData | null> {
  try {
    const endpoint = `${IMT_PROXY_BASE}/seguro/fetch?plate=${encodeURIComponent(plate.toUpperCase())}`;
    const response = await fetchWithAuth(endpoint);
    if (!response.ok) {
      console.warn('[InfoMatricula][Insurance] lookup failed', {
        plate,
        status: response.status,
      });
      return null;
    }
    const data = await response.json() as InsuranceData;
    console.info('[InfoMatricula][Insurance] lookup success', {
      plate,
      hasEntity: Boolean(data.entity),
    });
    return data;
  } catch (error) {
    console.warn('[InfoMatricula][Insurance] lookup error', error);
    return null;
  }
}
