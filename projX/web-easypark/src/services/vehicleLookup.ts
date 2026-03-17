const FIREBASE_API_KEY = import.meta.env.VITE_FIREBASE_API_KEY as string;
const FIREBASE_SIGN_IN_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`;

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

interface FirebaseToken {
  idToken: string;
  expiresAt: number;
}

let cachedToken: FirebaseToken | null = null;

async function getFirebaseToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < cachedToken.expiresAt) return cachedToken.idToken;

  const res = await fetch(FIREBASE_SIGN_IN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true }),
  });

  if (!res.ok) throw new Error('Não foi possível autenticar com o serviço de matrículas.');

  const data = await res.json();
  cachedToken = {
    idToken: data.idToken,
    expiresAt: now + (Number.parseInt(data.expiresIn, 10) - 60) * 1000,
  };

  return cachedToken.idToken;
}

const RETRYABLE_STATUSES = new Set([502, 503, 504]);
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithAuth(endpoint: string): Promise<Response> {
  const token = await getFirebaseToken();
  return fetch(endpoint, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  });
}

export async function lookupVehicleData(plate: string): Promise<VehicleData> {
  const endpoint = `/infomatricula/informacao/fetch?plate=${encodeURIComponent(plate)}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetchWithAuth(endpoint);

    if (res.ok) {
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json'))
        throw new Error('Resposta inválida da API (esperado JSON).');
      return res.json() as Promise<VehicleData>;
    }

    if (RETRYABLE_STATUSES.has(res.status) && attempt < 2) {
      await delay((attempt + 1) * 700);
      continue;
    }

    if (res.status === 404) throw new Error('Matrícula não encontrada na base de dados.');
    if (res.status === 429) throw new Error('Demasiados pedidos. Aguarde um momento.');
    if (res.status === 401 || res.status === 403) throw new Error('Autorização negada pelo serviço de matrículas.');
    throw new Error(`Erro ${res.status}: não foi possível obter dados do veículo.`);
  }

  throw new Error('Serviço de matrículas indisponível de momento.');
}

export async function lookupInsuranceData(plate: string): Promise<InsuranceData | null> {
  try {
    const res = await fetchWithAuth(`/infomatricula/seguro/fetch?plate=${encodeURIComponent(plate)}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

