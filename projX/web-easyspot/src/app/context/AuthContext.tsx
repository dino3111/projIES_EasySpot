import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { withGlobalLoading } from './LoadingContext';
import type { AppProfile } from './ProfileContext';

const AUTHENTIK_BASE = (import.meta.env.VITE_AUTHENTIK_URL ?? 'http://localhost/authentik').replaceAll(/\/$/g, '');
const CLIENT_ID      = import.meta.env.VITE_AUTHENTIK_CLIENT_ID ?? '';
const REDIRECT_URI   = import.meta.env.VITE_AUTHENTIK_REDIRECT_URI ?? 'http://localhost/callback';
const LOGOUT_REDIRECT_URI = import.meta.env.VITE_AUTHENTIK_LOGOUT_REDIRECT_URI ?? new URL('/welcome', REDIRECT_URI).toString();

const EXPECTED_ISSUERS = [
  `${AUTHENTIK_BASE}/application/o/easyspot/`,
  `${AUTHENTIK_BASE}/`,
] as const;
const AUTHORIZE_URL  = `${AUTHENTIK_BASE}/application/o/authorize/`;
const TOKEN_URL      = `${AUTHENTIK_BASE}/application/o/token/`;
const LOGOUT_URL     = `${AUTHENTIK_BASE}/application/o/easyspot/end-session/`;
const ENROLLMENT_URL = `${AUTHENTIK_BASE}/if/flow/easyspot-enrollment/`;

const SK = {
  accessToken:  'es_access_token',
  idToken:      'es_id_token',
  refreshToken: 'es_refresh_token',
  pkceVerifier: 'es_pkce_verifier',
  pkceState:    'es_pkce_state',
  recentAuthTs: 'es_recent_auth_ts',
} as const;

// PKCE values must survive redirects — use localStorage, not sessionStorage
const REFRESH_WINDOW_MS = 2 * 60_000;
const SESSION_EXPIRY_GRACE_MS = 30_000;

export interface AuthUser {
  sub: string;
  name?: string;
  email?: string;
  role: AppProfile;
}

interface AuthContextType {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: () => Promise<void>;
  register: () => void;
  logout: () => void;
  handleCallback: (code: string, state: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

function base64urlEncode(bytes: Uint8Array): string {
  return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

async function sha256(plain: string): Promise<Uint8Array> {
  const encoded = new TextEncoder().encode(plain);
  const digest  = await crypto.subtle.digest('SHA-256', encoded);
  return new Uint8Array(digest);
}

function parseJwtClaims(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) return {};
  try {
    const b64 = parts[1].replaceAll('-', '+').replaceAll('_', '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return {};
  }
}

function normalizeIssuer(issuer: unknown): string {
  const s = typeof issuer === 'string' ? issuer : (issuer ? String(issuer) : '');
  return s.replace(/\/+$/u, '');
}

function tokenIssuerMatches(claims: Record<string, unknown>): boolean {
  const tokenIssuer = normalizeIssuer(claims['iss']);
  if (!tokenIssuer) return true;
  return EXPECTED_ISSUERS.some((issuer) => normalizeIssuer(issuer) === tokenIssuer);
}

function clearAuthStorage() {
  Object.values(SK).forEach((k) => sessionStorage.removeItem(k));
}

function extractRole(claims: Record<string, unknown>): AppProfile {
  const groups = claims['groups'];
  if (import.meta.env.DEV) console.log('[AUTH] extractRole — raw groups:', groups);
  if (Array.isArray(groups) && groups.length > 0) {
    for (const g of groups) {
      const r = String(g).replace(/^\/+/, '').toUpperCase();
      if (r === 'MANAGER' || r === 'TECHNICAL') return r as AppProfile;
    }
  }
  return 'DRIVER';
}

function buildUser(claims: Record<string, unknown>): AuthUser {
  const claimToString = (value: unknown): string => {
    if (value == null) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return typeof value === 'string' ? value : String(value);
  };

  return {
    sub:   claimToString(claims['sub']),
    name:  claims['name']  ? claimToString(claims['name'])  : undefined,
    email: claims['email'] ? claimToString(claims['email']) : undefined,
    role:  extractRole(claims),
  };
}

function getTokenExpirationMs(token: string): number | null {
  const claims = parseJwtClaims(token);
  const exp = claims['exp'];
  if (typeof exp !== 'number') return null;
  return exp * 1000;
}

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [user,        setUser]        = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading,   setIsLoading]   = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem(SK.accessToken);
    console.log('[AUTH] AuthProvider init — token:', token ? 'EXISTS' : 'MISSING');
    if (token) {
      const claims = parseJwtClaims(token);
      if (!tokenIssuerMatches(claims)) {
        console.warn('[AUTH] clearing token with unexpected issuer:', claims['iss'], 'expected one of:', EXPECTED_ISSUERS);
        clearAuthStorage();
        setIsLoading(false);
        return;
      }
      const u = buildUser(claims);
      console.log('[AUTH] AuthProvider restoring user:', u.sub, 'role:', u.role, 'issuer:', claims['iss']);
      setUser(u);
      setAccessToken(token);
    }
    setIsLoading(false);
  }, []);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    const refreshToken = sessionStorage.getItem(SK.refreshToken);
    if (!refreshToken) return null;

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      refresh_token: refreshToken,
    });

    const resp = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!resp.ok) return null;

    const data = await resp.json() as {
      access_token: string;
      id_token?: string;
      refresh_token?: string;
    };

    const claims = parseJwtClaims(data.access_token);
    if (!tokenIssuerMatches(claims)) {
      console.warn('[AUTH] refreshed token has unexpected issuer:', claims['iss'], 'expected one of:', EXPECTED_ISSUERS);
      clearAuthStorage();
      return null;
    }

    sessionStorage.setItem(SK.accessToken, data.access_token);
    if (data.id_token) sessionStorage.setItem(SK.idToken, data.id_token);
    if (data.refresh_token) sessionStorage.setItem(SK.refreshToken, data.refresh_token);

    setUser(buildUser(claims));
    setAccessToken(data.access_token);
    return data.access_token;
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    let isRefreshing = false;

    const tick = async () => {
      const expMs = getTokenExpirationMs(sessionStorage.getItem(SK.accessToken) ?? accessToken);
      if (!expMs) return;
      const nowMs = Date.now();
      const msUntilExpiry = expMs - nowMs;
      if (msUntilExpiry > REFRESH_WINDOW_MS || isRefreshing) return;

      isRefreshing = true;
      try {
        const refreshed = await refreshAccessToken();
        if (refreshed) return;

        // Avoid dropping users on transient failures (network hiccup, slow auth server).
        // Only force logout when the token has already expired beyond a grace period.
        if (msUntilExpiry <= -SESSION_EXPIRY_GRACE_MS) {
          clearAuthStorage();
          setUser(null);
          setAccessToken(null);
          globalThis.location.href = '/welcome?session=expired';
        }
      } finally {
        isRefreshing = false;
      }
    };

    const id = globalThis.setInterval(() => {
      void tick();
    }, 15_000);
    void tick();
    return () => globalThis.clearInterval(id);
  }, [accessToken, refreshAccessToken]);

  const login = useCallback(async () => {
    const verifier  = base64urlEncode(randomBytes(32));
    const stateVal  = base64urlEncode(randomBytes(16));
    const challenge = base64urlEncode(await sha256(verifier));

    localStorage.setItem(SK.pkceVerifier, verifier);
    localStorage.setItem(SK.pkceState,    stateVal);

    const params = new URLSearchParams({
      response_type:         'code',
      client_id:             CLIENT_ID,
      redirect_uri:          REDIRECT_URI,
      scope:                 'openid profile email groups offline_access',
      state:                 stateVal,
      code_challenge:        challenge,
      code_challenge_method: 'S256',
    });

    globalThis.location.href = `${AUTHORIZE_URL}?${params.toString()}`;
  }, []);

  const register = useCallback(async () => {
    const verifier  = base64urlEncode(randomBytes(32));
    const stateVal  = base64urlEncode(randomBytes(16));
    const challenge = base64urlEncode(await sha256(verifier));

    localStorage.setItem(SK.pkceVerifier, verifier);
    localStorage.setItem(SK.pkceState,    stateVal);

    const authorizeParams = new URLSearchParams({
      response_type:         'code',
      client_id:             CLIENT_ID,
      redirect_uri:          REDIRECT_URI,
      scope:                 'openid profile email groups offline_access',
      state:                 stateVal,
      code_challenge:        challenge,
      code_challenge_method: 'S256',
    });

    // Authentik enrollment flow validates `next`; using a relative path avoids
    // "Invalid next URL" rejections behind reverse-proxy/localhost setups.
    const next = `/authentik/application/o/authorize/?${authorizeParams.toString()}`;
    globalThis.location.href = `${ENROLLMENT_URL}?next=${encodeURIComponent(next)}`;
  }, []);

  const handleCallback = useCallback(async (code: string, state: string) => {
    const savedState   = localStorage.getItem(SK.pkceState);
    const codeVerifier = localStorage.getItem(SK.pkceVerifier);

    if (state !== savedState) throw new Error('State mismatch — possible CSRF');
    if (!codeVerifier)        throw new Error('Missing PKCE verifier');

    localStorage.removeItem(SK.pkceState);
    localStorage.removeItem(SK.pkceVerifier);

    const body = new URLSearchParams({
      grant_type:    'authorization_code',
      client_id:     CLIENT_ID,
      redirect_uri:  REDIRECT_URI,
      code,
      code_verifier: codeVerifier,
    });

    const resp = await withGlobalLoading(() => fetch(TOKEN_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    }));

    if (!resp.ok) {
      const text = await resp.text();
      let detail = text;
      try {
        const parsed = JSON.parse(text) as { error?: string; error_description?: string };
        if (parsed.error) detail = `${parsed.error}${parsed.error_description ? ': ' + parsed.error_description : ''}`;
      } catch { /* keep raw text */ }
      console.error('[AUTH] token exchange failed', {
        status: resp.status,
        url: TOKEN_URL,
        clientId: CLIENT_ID,
        redirectUri: REDIRECT_URI,
        detail,
      });
      throw new Error(`Token exchange failed (${resp.status}): ${detail}`);
    }

    const data = await resp.json() as {
      access_token: string;
      id_token?: string;
      refresh_token?: string;
    };

    const claims = parseJwtClaims(data.access_token);
    if (!tokenIssuerMatches(claims)) {
      console.warn('[AUTH] callback token has unexpected issuer:', claims['iss'], 'expected one of:', EXPECTED_ISSUERS);
      clearAuthStorage();
      throw new Error('Sessão inválida para este ambiente. Inicie sessão novamente.');
    }

    sessionStorage.setItem(SK.accessToken, data.access_token);
    if (data.id_token)      sessionStorage.setItem(SK.idToken,      data.id_token);
    if (data.refresh_token) sessionStorage.setItem(SK.refreshToken, data.refresh_token);
    sessionStorage.setItem(SK.recentAuthTs, String(Date.now()));

    const authedUser = buildUser(claims);
    console.log('[AUTH] handleCallback — setUser:', authedUser.sub, 'role:', authedUser.role, 'issuer:', claims['iss']);
    setUser(authedUser);
    setAccessToken(data.access_token);
  }, []);

  const logout = useCallback(() => {
    const idToken = sessionStorage.getItem(SK.idToken);
    clearAuthStorage();
    setUser(null);
    setAccessToken(null);

    const params = new URLSearchParams({ post_logout_redirect_uri: LOGOUT_REDIRECT_URI });
    // Authentik invalidation flows reliably honor `next`; keep both for compatibility.
    params.set('next', LOGOUT_REDIRECT_URI);
    if (CLIENT_ID) params.set('client_id', CLIENT_ID);
    if (idToken) params.set('id_token_hint', idToken);
    const logoutHref = `${LOGOUT_URL}?${params.toString()}`;

    // Avoid landing users on Authentik's default invalidation page while still
    // terminating the provider session. Call end-session in background and
    // always return to the app's post-logout route.
    void (async () => {
      try {
        await fetch(logoutHref, {
          method: 'GET',
          credentials: 'include',
          redirect: 'follow',
          cache: 'no-store',
        });
      } catch (error) {
        console.warn('[AUTH] provider logout request failed; continuing local logout', error);
      } finally {
        globalThis.location.href = LOGOUT_REDIRECT_URI;
      }
    })();
  }, []);

  return (
    <AuthContext.Provider value={useMemo(() => ({
      user,
      accessToken,
      isLoading,
      login,
      register,
      logout,
      handleCallback
    }), [user, accessToken, isLoading, login, register, logout, handleCallback])}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useOptionalAuth(): AuthContextType | null {
  return useContext(AuthContext) ?? null;
}
