import { Link, useLocation } from 'react-router';
import { useProfile } from '../../context/ProfileContext';

interface NavItem {
  path: string;
  icon: string;
  label: string;
  exact: boolean;
}

const driverNav: NavItem[] = [
  { path: '/',         icon: 'fa-list',               label: 'Lista de Parques',          exact: true },
  { path: '/map',      icon: 'fa-map-location-dot',   label: 'Mapa',                      exact: false },
  { path: '/costs',    icon: 'fa-wallet',              label: 'Custos',                    exact: false },
  { path: '/favorites',icon: 'fa-star',               label: 'Favoritos',                 exact: false },
  { path: '/profile',  icon: 'fa-user',               label: 'Perfil',                    exact: false },
];

const managerNav: NavItem[] = [
  { path: '/manager/dashboard',          icon: 'fa-chart-line',          label: 'Painel de Desempenho',   exact: true },
  { path: '/manager/tariffs-incidents',  icon: 'fa-file-invoice-dollar', label: 'Tarifas & Ocorrências',  exact: false },
  { path: '/manager/parks',              icon: 'fa-parking',             label: 'Parques',                exact: false },
  { path: '/profile',                    icon: 'fa-gear',                label: 'Definições',             exact: false },
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

export function Sidebar() {
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
      className="hidden md:flex flex-col bg-card border-r border-border transition-colors duration-300"
      style={{ width: '220px', minWidth: '220px' }}
      aria-label="Menu lateral"
    >
      <nav className="flex flex-col gap-1 p-3 pt-4">
        {(profile === 'MANAGER' || profile === 'TECHNICAL') && (
          <div className="px-3 pb-1 mb-1">
            <p className="text-muted-foreground uppercase" style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em' }}>
              {profile === 'MANAGER' ? 'Painel do Gestor' : 'Painel Técnico'}
            </p>
          </div>
        )}

        {navItems.map((item) => {
          const active = isActive(item.path, item.exact, location.pathname);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
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
                style={{ width: '18px', textAlign: 'center', fontSize: '1rem' }}
              />
              <span style={{ fontSize: '0.875rem' }}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {(profile === 'MANAGER' || profile === 'TECHNICAL') && (
        <SidebarRoleBadge profile={profile} />
      )}
    </aside>
  );
}

function SidebarRoleBadge({ profile }: { readonly profile: 'MANAGER' | 'TECHNICAL' }) {
  const isManager = profile === 'MANAGER';
  return (
    <div className="mt-auto p-3">
      <div className="flex items-center gap-2 rounded-xl p-2.5 bg-primary/10 border border-primary/20">
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
          <p className="text-muted-foreground" style={{ fontSize: '0.62rem' }}>
            {isManager ? 'António Videira' : 'Laura Farias'}
          </p>
        </div>
      </div>
    </div>
  );
}
