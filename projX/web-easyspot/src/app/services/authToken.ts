const AUTHENTIK_BASE = (import.meta.env.VITE_AUTHENTIK_URL ?? 'http://localhost/authentik').replaceAll(/\/$/g, '');
const EXPECTED_ISSUER = `${AUTHENTIK_BASE}/application/o/easyspot/`;

const AUTH_STORAGE_KEYS = ['es_access_token', 'es_id_token', 'es_refresh_token', 'es_pkce_verifier', 'es_pkce_state'] as const;

function parseJwtClaims(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) return {};
  try {
    return JSON.parse(atob(parts[1].replaceAll('-', '+').replaceAll('_', '/')));
  } catch {
    return {};
  }
}

function normalizeIssuer(issuer: unknown): string {
  return String(issuer ?? '').replace(/\/+$/g, '');
}

function isExpectedIssuer(token: string): boolean {
  return normalizeIssuer(parseJwtClaims(token)['iss']) === normalizeIssuer(EXPECTED_ISSUER);
}

function clearSessionAuthStorage() {
  for (const key of AUTH_STORAGE_KEYS) sessionStorage.removeItem(key);
}

function usableToken(token?: string): string | null {
  if (!token) return null;
  if (isExpectedIssuer(token)) return token;

  console.warn('[AUTH] ignoring token with unexpected issuer:', parseJwtClaims(token)['iss'], 'expected:', EXPECTED_ISSUER);
  clearSessionAuthStorage();
  return null;
}

export function getAccessToken(): string | null {
  try {
    const sessionToken = sessionStorage.getItem('es_access_token');
    const validSessionToken = usableToken(sessionToken ?? undefined);
    if (validSessionToken) return validSessionToken;

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index) ?? '';
      if (!key.startsWith('oidc.user:')) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as { access_token?: string };
      const validLocalToken = usableToken(parsed.access_token);
      if (validLocalToken) return validLocalToken;
    }
    return null;
  } catch {
    return null;
  }
}
