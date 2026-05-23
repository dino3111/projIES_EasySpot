import { useRef, useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '../../context/AuthContext';
import { useWs, type WsStatus } from '../../context/WsContext';
import type { AppProfile } from '../../context/ProfileContext';
import { profileApi } from '../../../services/apiService';

const ROLE_META: Record<AppProfile, { icon: string; label: string; color: string }> = {
  DRIVER:    { icon: 'fa-car',               label: 'Condutor',  color: '#22c55e' },
  MANAGER:   { icon: 'fa-building',           label: 'Gestor',    color: '#f59e0b' },
  TECHNICAL: { icon: 'fa-screwdriver-wrench', label: 'Técnico',   color: '#3b82f6' },
};

const HOME_BY_ROLE: Record<AppProfile, string> = {
  DRIVER:    '/',
  MANAGER:   '/manager/dashboard',
  TECHNICAL: '/technician/dashboard',
};

export function Header() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { user, logout } = useAuth();

  const isDetailPage = location.pathname.startsWith('/parking/');
  const role = user?.role ?? 'DRIVER';
  const meta = ROLE_META[role];
  const home = HOME_BY_ROLE[role];

  return (
    <header
      className="sticky top-0 z-[9999] shadow-md"
      style={{ background: 'linear-gradient(135deg, #7357ec 0%, #5948a6 100%)', minHeight: '56px' }}
    >
      <div className="flex items-center justify-between px-4 h-14 max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-3">
          {isDetailPage && (
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/15 transition-colors"
              type="button"
              aria-label="Voltar"
            >
              <i className="fas fa-arrow-left text-white text-base" aria-hidden="true" />
            </button>
          )}
          <Link
            to={home}
            className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
            aria-label="EasySpot - Página inicial"
          >
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <i className="fas fa-square-parking text-white text-base" aria-hidden="true" />
            </div>
            <span className="text-white" style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              EasySpot
            </span>
          </Link>

          {role !== 'DRIVER' && (
            <span
              className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-white"
              style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em' }}
            >
              <i className={`fas ${meta.icon}`} style={{ fontSize: '0.6rem' }} aria-hidden="true" />
              {meta.label.toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <RealtimeBadge />
          <ThemeToggle />
          <UserMenu user={user} meta={meta} onLogout={logout} />
        </div>
      </div>
    </header>
  );
}

function RealtimeBadge() {
  const { status } = useWs();

  const config: Record<WsStatus, { dot: string; label: string; ping: boolean }> = {
    connected:    { dot: 'bg-green-400',  label: 'Tempo Real', ping: true },
    connecting:   { dot: 'bg-amber-400',  label: 'A Ligar...', ping: false },
    disconnected: { dot: 'bg-slate-400', label: 'Desligado',  ping: false },
  };

  const { dot, label, ping } = config[status];

  return (
    <div
      className="hidden sm:flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full"
      aria-live="polite"
      aria-label={`Estado da ligação: ${label}`}
    >
      <span className="relative flex h-2 w-2" aria-hidden="true">
        {ping && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dot} opacity-75`} />}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${dot}`} />
      </span>
      <span className="text-white/90" style={{ fontSize: '0.75rem', fontWeight: 500 }}>
        {label}
      </span>
    </div>
  );
}

interface UserMenuProps {
  readonly user: ReturnType<typeof useAuth>['user'];
  readonly meta: { icon: string; label: string; color: string };
  readonly onLogout: () => void;
}

interface UserDropdownProps {
  readonly user: UserMenuProps['user'];
  readonly meta: UserMenuProps['meta'];
  readonly onLogout: () => void;
  readonly onClose: () => void;
}

function UserMenu({ user, meta, onLogout }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    profileApi.get().then((data) => setPhotoUrl(data.photoUrl)).catch(() => setPhotoUrl(null));
  }, [user]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/15 transition-colors relative"
        aria-label="Menu do utilizador"
        aria-expanded={open}
        aria-haspopup="true"
        type="button"
      >
        {photoUrl ? (
          <img src={photoUrl} alt="Foto de perfil" className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <i className={`fas ${meta.icon} text-white text-lg`} aria-hidden="true" />
        )}
        <span
          className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white"
          style={{ background: meta.color }}
          aria-hidden="true"
        />
      </button>

      {open && (
        <UserDropdown user={user} meta={meta} onLogout={onLogout} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}

function UserDropdown({
  user,
  meta,
  onLogout,
  onClose,
}: UserDropdownProps) {
  return (
    <div
      className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-[9999]"
      role="menu"
    >
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${meta.color}20` }}
        >
          <i className={`fas ${meta.icon}`} style={{ color: meta.color, fontSize: '0.9rem' }} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-foreground font-semibold truncate" style={{ fontSize: '0.85rem' }}>
            {user?.name ?? user?.email ?? 'Utilizador'}
          </p>
          <p className="text-muted-foreground" style={{ fontSize: '0.7rem' }}>
            {meta.label}
          </p>
        </div>
      </div>

      <Link
        to="/profile"
        onClick={onClose}
        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors no-underline"
        role="menuitem"
      >
        <i className="fas fa-gear text-muted-foreground" style={{ width: '16px', fontSize: '0.85rem' }} aria-hidden="true" />
        <span className="text-foreground" style={{ fontSize: '0.85rem' }}>Definições de Perfil</span>
      </Link>

      <div className="h-px bg-border" aria-hidden="true" />

      <button
        onClick={onLogout}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-destructive/10 transition-colors text-left"
        role="menuitem"
        type="button"
      >
        <i className="fas fa-arrow-right-from-bracket text-destructive" style={{ width: '16px', fontSize: '0.85rem' }} aria-hidden="true" />
        <span className="text-destructive font-medium" style={{ fontSize: '0.85rem' }}>Terminar sessão</span>
      </button>
    </div>
  );
}
