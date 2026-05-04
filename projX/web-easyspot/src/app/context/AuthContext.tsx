import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { AppProfile } from './ProfileContext';

const AUTHENTIK_BASE = (import.meta.env.VITE_AUTHENTIK_URL ?? 'http://localhost:9000/authentik').replace(/\/$/, '');
const CLIENT_ID      = import.meta.env.VITE_AUTHENTIK_CLIENT_ID ?? '';
const REDIRECT_URI   = import.meta.env.VITE_AUTHENTIK_REDIRECT_URI ?? 'http://localhost/callback';

const AUTHORIZE_URL  = `${AUTHENTIK_BASE}/application/o/authorize/`;
const TOKEN_URL      = `${AUTHENTIK_BASE}/application/o/token/`;
const LOGOUT_URL     = `${AUTHENTIK_BASE}/application/o/easyspot/end-session/`;
const ENROLLMENT_URL = `${AUTHENTIK_BASE}/if/flow/default-enrollment-flow/`;

const SK = {
  accessToken:  'es_access_token',
  idToken:      'es_id_token',
  refreshToken: 'es_refresh_token',
  pkceVerifier: 'es_pkce_verifier',
  pkceState:    'es_pkce_state',
} as const;

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
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
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
    return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return {};
  }
}

function extractRole(claims: Record<string, unknown>): AppProfile {
  const groups = claims['groups'];
  if (Array.isArray(groups) && groups.length > 0) {
    const r = String(groups[0]).toUpperCase();
    if (r === 'MANAGER' || r === 'TECHNICAL') return r as AppProfile;
  }
  return 'DRIVER';
}

function buildUser(claims: Record<string, unknown>): AuthUser {
  return {
    sub:   String(claims['sub'] ?? ''),
    name:  claims['name']  ? String(claims['name'])  : undefined,
    email: claims['email'] ? String(claims['email']) : undefined,
    role:  extractRole(claims),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,        setUser]        = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading,   setIsLoading]   = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem(SK.accessToken);
    if (token) {
      const claims = parseJwtClaims(token);
      setUser(buildUser(claims));
      setAccessToken(token);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async () => {
    const verifier  = base64urlEncode(randomBytes(32));
    const stateVal  = base64urlEncode(randomBytes(16));
    const challenge = base64urlEncode(await sha256(verifier));

    sessionStorage.setItem(SK.pkceVerifier, verifier);
    sessionStorage.setItem(SK.pkceState,    stateVal);

    const params = new URLSearchParams({
      response_type:         'code',
      client_id:             CLIENT_ID,
      redirect_uri:          REDIRECT_URI,
      scope:                 'openid profile email groups',
      state:                 stateVal,
      code_challenge:        challenge,
      code_challenge_method: 'S256',
    });

    window.location.href = `${AUTHORIZE_URL}?${params.toString()}`;
  }, []);

  const register = useCallback(() => {
    window.location.href = ENROLLMENT_URL;
  }, []);

  const handleCallback = useCallback(async (code: string, state: string) => {
    const savedState   = sessionStorage.getItem(SK.pkceState);
    const codeVerifier = sessionStorage.getItem(SK.pkceVerifier);

    if (state !== savedState) throw new Error('State mismatch — possible CSRF');
    if (!codeVerifier)        throw new Error('Missing PKCE verifier');

    sessionStorage.removeItem(SK.pkceState);
    sessionStorage.removeItem(SK.pkceVerifier);

    const body = new URLSearchParams({
      grant_type:    'authorization_code',
      client_id:     CLIENT_ID,
      redirect_uri:  REDIRECT_URI,
      code,
      code_verifier: codeVerifier,
    });

    const resp = await fetch(TOKEN_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Token exchange failed: ${text}`);
    }

    const data = await resp.json() as {
      access_token: string;
      id_token?: string;
      refresh_token?: string;
    };

    sessionStorage.setItem(SK.accessToken, data.access_token);
    if (data.id_token)      sessionStorage.setItem(SK.idToken,      data.id_token);
    if (data.refresh_token) sessionStorage.setItem(SK.refreshToken, data.refresh_token);

    const claims     = parseJwtClaims(data.id_token ?? data.access_token);
    const authedUser = buildUser(claims);
    setUser(authedUser);
    setAccessToken(data.access_token);
  }, []);

  const logout = useCallback(() => {
    const idToken = sessionStorage.getItem(SK.idToken);
    Object.values(SK).forEach((k) => sessionStorage.removeItem(k));
    setUser(null);
    setAccessToken(null);

    const params = new URLSearchParams({ post_logout_redirect_uri: `${window.location.origin}/welcome` });
    if (idToken) params.set('id_token_hint', idToken);
    window.location.href = `${LOGOUT_URL}?${params.toString()}`;
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, register, logout, handleCallback }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
