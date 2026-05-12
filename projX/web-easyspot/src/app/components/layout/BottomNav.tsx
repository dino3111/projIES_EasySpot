import { Link, useLocation } from 'react-router';
import { useProfile } from '../../context/ProfileContext';

interface NavTab {
  path: string;
  icon: string;
  label: string;
  exact: boolean;
}

const technicianTabs: NavTab[] = [
  { path: '/technician/dashboard',   icon: 'fa-gauge-high',         label: 'Painel',     exact: true },
  { path: '/technician/maintenance', icon: 'fa-screwdriver-wrench', label: 'Manutenção', exact: false },
  { path: '/profile',                icon: 'fa-gear',               label: 'Definições', exact: false },
];

const managerTabs: NavTab[] = [
  { path: '/manager/dashboard',         icon: 'fa-chart-line',         label: 'Painel',   exact: true },
  { path: '/manager/tariffs-incidents', icon: 'fa-file-invoice-dollar', label: 'Tarifas', exact: false },
  { path: '/profile',                   icon: 'fa-gear',               label: 'Definições', exact: false },
];

const driverTabs: NavTab[] = [
  { path: '/',             icon: 'fa-list',             label: 'Lista',   exact: true },
  { path: '/map',          icon: 'fa-map-location-dot', label: 'Mapa',    exact: false },
  { path: '/reservations', icon: 'fa-bookmark',         label: 'Reservas',exact: false },
  { path: '/costs',        icon: 'fa-wallet',           label: 'Custos',  exact: false },
  { path: '/profile',      icon: 'fa-user',             label: 'Perfil',  exact: false },
];

function isActive(path: string, exact: boolean, current: string): boolean {
  if (exact) return current === path;
  return current.startsWith(path);
}

export function BottomNav() {
  const location = useLocation();
  const { profile } = useProfile();

  const getTabs = () => {
    switch (profile) {
      case 'MANAGER':   return managerTabs;
      case 'TECHNICAL': return technicianTabs;
      default:          return driverTabs;
    }
  };

  const tabs = getTabs();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card border-t border-border shadow-[0_-4px_16px_rgba(0,0,0,0.1)] transition-colors duration-300"
      role="navigation"
      aria-label="Navegação principal"
    >
      <div className="flex items-stretch h-16">
        {tabs.map((tab) => {
          const active = isActive(tab.path, tab.exact, location.pathname);
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors relative no-underline ${
                active ? 'text-primary bg-primary/10 font-bold' : 'text-foreground/50'
              }`}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
            >
              <i
                className={`fas ${tab.icon}`}
                aria-hidden="true"
                style={{ fontSize: active ? '1.25rem' : '1.125rem' }}
              />
              <span style={{ fontSize: '11px', lineHeight: 1 }}>{tab.label}</span>
              {active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-primary rounded-b-sm"
                  aria-hidden="true"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
