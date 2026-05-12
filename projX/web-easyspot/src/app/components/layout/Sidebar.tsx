import { Link, useLocation } from 'react-router';
import { useProfile } from '../../context/ProfileContext';

interface NavItem {
  path: string;
  icon: string;
  label: string;
  exact: boolean;
}

const driverNav: NavItem[] = [
  { path: '/',             icon: 'fa-list',               label: 'Lista de Parques',          exact: true },
  { path: '/map',          icon: 'fa-map-location-dot',   label: 'Mapa',                      exact: false },
  { path: '/reservations', icon: 'fa-bookmark',           label: 'Reservas',                  exact: false },
  { path: '/costs',        icon: 'fa-wallet',             label: 'Custos',                    exact: false },
  { path: '/favorites',    icon: 'fa-star',               label: 'Favoritos',                 exact: false },
  { path: '/profile',      icon: 'fa-user',               label: 'Perfil',                    exact: false },
];

const managerNav: NavItem[] = [
  { path: '/manager/dashboard',          icon: 'fa-chart-line',         label: 'Painel de Desempenho',    exact: true },
  { path: '/manager/tariffs-incidents',  icon: 'fa-file-invoice-dollar', label: 'Tarifas & Ocorrências',  exact: false },
  { path: '/profile',                    icon: 'fa-gear',               label: 'Definições',              exact: false },
];

const technicianNav: NavItem[] = [
  { path: '/technician/dashboard',    icon: 'fa-gauge-high',          label: 'Painel Técnico',            exact: true },
  { path: '/technician/maintenance',  icon: 'fa-screwdriver-wrench',  label: 'Diagnóstico & Manutenção',  exact: false },
  { path: '/technician/map',          icon: 'fa-map-location-dot',    label: 'Mapa',                      exact: false },
  { path: '/profile',                 icon: 'fa-gear',                label: 'Definições',                exact: false },
];

function isActive(path: string, exact: boolean, current: string): boolean {
  if (exact) return current === path;
  return current.startsWith(path);
}

interface SidebarProps {
  readonly isCollapsed: boolean;
  readonly onToggleCollapsed: () => void;
}

export function Sidebar({ isCollapsed, onToggleCollapsed }: SidebarProps) {
  const location = useLocation();
  const { profile } = useProfile();

  const getNavItems = () => {
    switch (profile) {
      case 'MANAGER':   return managerNav;
      case 'TECHNICAL': return technicianNav;
      default:          return driverNav;
    }
  };

  const navItems = getNavItems();

  return (
    <aside
      className="hidden md:flex h-full flex-col overflow-y-auto bg-card border-r border-border transition-colors duration-300"
      style={{ width: isCollapsed ? '74px' : '220px', minWidth: isCollapsed ? '74px' : '220px' }}
      aria-label="Menu lateral"
    >
      <nav className={`flex flex-col gap-1 pt-4 ${isCollapsed ? 'px-2' : 'px-3'}`}>
        {(profile === 'MANAGER' || profile === 'TECHNICAL') && (
          <div className={`pb-1 mb-1 ${isCollapsed ? 'px-1 text-center' : 'px-3'}`}>
            <p className="text-muted-foreground uppercase" style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em' }}>
              {isCollapsed
                ? (profile === 'MANAGER' ? 'Gestor' : 'Técnico')
                : (profile === 'MANAGER' ? 'Painel do Gestor' : 'Painel Técnico')}
            </p>
          </div>
        )}

        {navItems.map((item) => {
          const active = isActive(item.path, item.exact, location.pathname);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`rounded-xl transition-all ${
                isCollapsed
                  ? 'flex flex-col items-center justify-center gap-1 px-1 py-3 text-center'
                  : 'flex items-center gap-3 px-3 py-2.5'
              } ${
                active
                  ? 'bg-primary/20 text-primary border-l-[3px] border-primary font-bold'
                  : 'text-foreground/60 hover:bg-black/5 dark:hover:bg-white/5 border-l-[3px] border-transparent'
              }`}
              style={{ fontSize: '0.9rem', textDecoration: 'none' }}
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
            >
              <i
                className={`fas ${item.icon}`}
                aria-hidden="true"
                style={{ width: isCollapsed ? 'auto' : '18px', textAlign: 'center', fontSize: isCollapsed ? '1.1rem' : '1rem' }}
              />
              <span style={{ fontSize: isCollapsed ? '0.68rem' : '0.875rem', lineHeight: isCollapsed ? 1.15 : 1.3 }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className={`mt-auto ${isCollapsed ? 'p-2' : 'p-3'}`}>
        {(profile === 'MANAGER' || profile === 'TECHNICAL') && (
          <SidebarRoleBadge profile={profile} isCollapsed={isCollapsed} />
        )}

        <button
          onClick={onToggleCollapsed}
          className={`mt-2 w-full rounded-xl border border-border bg-muted/40 hover:bg-muted/70 transition-colors text-foreground/80 ${
            isCollapsed ? 'flex flex-col items-center gap-1 px-1 py-2.5' : 'flex items-center justify-center gap-2 px-3 py-2.5'
          }`}
          aria-label={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
          aria-pressed={isCollapsed}
          type="button"
        >
          <i
            className={`fas ${isCollapsed ? 'fa-angles-right' : 'fa-angles-left'}`}
            aria-hidden="true"
            style={{ fontSize: isCollapsed ? '0.95rem' : '0.9rem' }}
          />
          <span style={{ fontSize: isCollapsed ? '0.62rem' : '0.78rem', lineHeight: 1.15 }}>
            {isCollapsed ? 'Abrir' : 'Recolher'}
          </span>
        </button>
      </div>
    </aside>
  );
}

function SidebarRoleBadge({
  profile,
  isCollapsed,
}: {
  readonly profile: 'MANAGER' | 'TECHNICAL';
  readonly isCollapsed: boolean;
}) {
  const isManager = profile === 'MANAGER';
  return (
    <div>
      <div
        className={`rounded-xl p-2.5 bg-primary/10 border border-primary/20 ${
          isCollapsed ? 'flex flex-col items-center text-center gap-1.5' : 'flex items-center gap-2'
        }`}
      >
        <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0" aria-hidden="true">
          <i
            className={`fas ${isManager ? 'fa-building' : 'fa-screwdriver-wrench'} text-primary`}
            style={{ fontSize: '0.75rem' }}
          />
        </div>
        <div className="min-w-0">
          <p className="text-primary" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
            {isManager ? 'Modo Gestor' : 'Modo Técnico'}
          </p>
          {!isCollapsed && (
            <p className="text-muted-foreground" style={{ fontSize: '0.62rem' }}>
              {isManager ? 'António Videira' : 'Laura Farias'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
