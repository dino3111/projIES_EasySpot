import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import type { AppProfile } from '../context/ProfileContext';

function roleDefaultRoute(role: AppProfile): string {
  if (role === 'MANAGER')   return '/manager/dashboard';
  if (role === 'TECHNICAL') return '/technician/dashboard';
  return '/';
}

export function CallbackPage() {
  const navigate              = useNavigate();
  const { handleCallback }    = useAuth();
  const { setProfile }        = useProfile();
  const [error, setError]     = useState<string | null>(null);
  const processed             = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const params   = new URLSearchParams(globalThis.location.search);
    const code     = params.get('code');
    const state    = params.get('state');
    const errParam = params.get('error');

    if (errParam) {
      setError(`Authentik error: ${errParam} — ${params.get('error_description') ?? ''}`);
      return;
    }

    if (!code || !state) {
      setError('Parâmetros de callback inválidos.');
      return;
    }

    handleCallback(code, state)
      .then(() => {
        const token  = globalThis.sessionStorage.getItem('es_access_token') ?? '';
        const parts  = token.split('.');
        let role: AppProfile = 'DRIVER';
        if (parts.length === 3) {
          try {
            const claims = JSON.parse(globalThis.atob(parts[1].replaceAll('-', '+').replaceAll('_', '/')));
            const groups = claims['groups'];
            if (Array.isArray(groups) && groups.length > 0) {
              const r = String(groups[0]).toUpperCase();
              if (r === 'MANAGER' || r === 'TECHNICAL') role = r as AppProfile;
            }
          } catch { /* ignore parse errors */ }
        }
        setProfile(role);
        navigate(roleDefaultRoute(role), { replace: true });
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Erro desconhecido no callback.';
        setError(msg);
      });
  // only runs once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-destructive/40 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <i className="fas fa-triangle-exclamation text-destructive" style={{ fontSize: '1.4rem' }} />
          </div>
          <p className="text-foreground font-bold" style={{ fontSize: '1rem' }}>Erro de autenticação</p>
          <p className="text-muted-foreground" style={{ fontSize: '0.85rem' }}>{error}</p>
          <button
            onClick={() => navigate('/welcome', { replace: true })}
            className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
            style={{ fontSize: '0.875rem' }}
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
          <i className="fas fa-square-parking text-primary-foreground" style={{ fontSize: '1.1rem' }} />
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <p className="text-muted-foreground" style={{ fontSize: '0.85rem' }}>A autenticar…</p>
      </div>
    </div>
  );
}
