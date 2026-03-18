import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useLocation } from 'react-router';
import { ThemeToggle } from './ThemeToggle';
import { useProfile } from '../../context/ProfileContext';
import type { AppProfile } from '../../context/ProfileContext';

const PROFILE_OPTIONS: {
  id: AppProfile;
  icon: string;
  label: string;
  desc: string;
  color: string;
  home: string;
}[] = [
  { id: 'condutor', icon: 'fa-car',               label: 'Condutor',              desc: 'Encontrar e reservar lugares',          color: '#22c55e', home: '/' },
  { id: 'gestor',   icon: 'fa-building',           label: 'Gestor de Parques',     desc: 'Dashboard, tarifas e ocorrências',      color: '#f59e0b', home: '/gestor/dashboard' },
  { id: 'tecnico',  icon: 'fa-screwdriver-wrench', label: 'Técnico de Manutenção', desc: 'Diagnóstico, sensores e tarefas',       color: '#3b82f6', home: '/tecnico/dashboard' },
];

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, setProfile, driverType } = useProfile();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isDetailPage = location.pathname.startsWith('/parque/');
  const currentOpt   = PROFILE_OPTIONS.find(o => o.id === profile) ?? PROFILE_OPTIONS[0];
  const logoHome     = currentOpt.home;

  const driverTypeLabel = driverType === 'ev'
    ? 'Condutor EV'
    : driverType === 'mobilidade_reduzida'
    ? 'Mobilidade Reduzida'
    : null;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSwitchProfile(next: AppProfile, home: string) {
    setProfile(next);
    setDropdownOpen(false);
    navigate(home);
  }

  return (
    <header
      className="sticky top-0 z-50 shadow-md"
      style={{ background: 'linear-gradient(135deg, #7357ec 0%, #5948a6 100%)', minHeight: '56px' }}
    >
      <div className="flex items-center justify-between px-4 h-14 max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-3">
          {isDetailPage ? (
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/15 transition-colors"
              aria-label="Voltar à lista de parques"
            >
              <i className="fas fa-arrow-left text-white text-base" aria-hidden="true"></i>
            </button>
          ) : null}
          <Link
            to={logoHome}
            className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
            aria-label="EasySpot - Página inicial"
          >
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <i className="fas fa-square-parking text-white text-base" aria-hidden="true"></i>
            </div>
            <span
              className="text-white"
              style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}
            >
              EasySpot
            </span>
          </Link>

          {profile !== 'condutor' && (
            <span
              className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-white"
              style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em' }}
            >
              <i className={`fas ${currentOpt.icon}`} style={{ fontSize: '0.6rem' }} aria-hidden="true"></i>
              {profile === 'gestor' ? 'GESTOR' : 'TÉCNICO'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div
            className="hidden sm:flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full"
            role="status"
            aria-label="Dados em tempo real"
          >
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-300"></span>
            </span>
            <span className="text-white/90" style={{ fontSize: '0.75rem', fontWeight: 500 }}>
              Tempo Real
            </span>
          </div>

          <ThemeToggle />

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/15 transition-colors relative"
              aria-label="Mudar de perfil"
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
            >
              <i className={`fas ${currentOpt.icon} text-white text-lg`} aria-hidden="true"></i>
              <span
                className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white"
                style={{ background: currentOpt.color }}
                aria-hidden="true"
              />
            </button>

            {dropdownOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-50"
                role="menu"
                aria-label="Mudar de perfil"
              >
                <div className="px-4 py-3 border-b border-border bg-muted/30">
                  <p className="text-foreground" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                    Mudar de Perfil
                  </p>
                  <p className="text-muted-foreground" style={{ fontSize: '0.7rem' }}>
                    Ativo: <span style={{ fontWeight: 600, color: currentOpt.color }}>{currentOpt.label}</span>
                  </p>
                </div>

                {PROFILE_OPTIONS.map((opt, idx) => (
                  <div key={opt.id}>
                    <button
                      role="menuitem"
                      onClick={() => handleSwitchProfile(opt.id, opt.home)}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/10 transition-colors text-left ${
                        profile === opt.id ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background: profile === opt.id ? opt.color : 'var(--color-muted)',
                          color: profile === opt.id ? '#fff' : 'var(--color-muted-foreground)',
                        }}
                        aria-hidden="true"
                      >
                        <i className={`fas ${opt.icon}`} style={{ fontSize: '0.9rem' }}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground" style={{ fontSize: '0.85rem', fontWeight: 600 }}>{opt.label}</p>
                        <p className="text-muted-foreground" style={{ fontSize: '0.7rem' }}>{opt.desc}</p>
                      </div>
                      {profile === opt.id && (
                        <i className="fas fa-circle-check text-primary flex-shrink-0" style={{ fontSize: '0.85rem' }} aria-hidden="true"></i>
                      )}
                    </button>
                    {idx < PROFILE_OPTIONS.length - 1 && (
                      <div className="h-px bg-border mx-3" aria-hidden="true" />
                    )}
                  </div>
                ))}

                <div className="h-px bg-border" aria-hidden="true" />
                <Link
                  to="/perfil"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors no-underline"
                  role="menuitem"
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-muted text-muted-foreground" aria-hidden="true">
                    <i className="fas fa-gear" style={{ fontSize: '0.9rem' }}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Definições de Perfil</p>
                    <p className="text-muted-foreground" style={{ fontSize: '0.7rem' }}>Notificações e preferências</p>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
