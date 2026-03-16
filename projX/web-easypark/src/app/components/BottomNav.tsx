import { Link, useLocation } from 'react-router';
import { useProfile, type DriverType } from '../context/ProfileContext';

interface NavTab {
  path: string;
  icon: string;
  label: string;
  exact: boolean;
  priority: number; // Para ordenar
}

const tecnicoTabs = [
  { path: '/tecnico/dashboard', icon: 'fa-gauge-high', label: 'Painel', exact: true },
  { path: '/tecnico/manutencao', icon: 'fa-screwdriver-wrench', label: 'Manutenção', exact: false },
  { path: '/perfil', icon: 'fa-gear', label: 'Definições', exact: false },
];

export function BottomNav() {
  const location = useLocation();
  const { profile, driverType } = useProfile();

  // Tabs para condutores - adapta conforme o tipo
  const getCondutorTabs = (): NavTab[] => {
    const baseTabs: NavTab[] = [
      { path: '/', icon: 'fa-list', label: 'Lista', exact: true, priority: 1 },
      { path: '/mapa', icon: 'fa-map-location-dot', label: 'Mapa', exact: false, priority: 2 },
      { path: '/perfil', icon: 'fa-user', label: 'Perfil', exact: false, priority: 10 },
    ];

    // Adicionar tab específica baseada no driverType
    if (driverType === 'ev') {
      baseTabs.push(
        { path: '/custos', icon: 'fa-wallet', label: 'Custos', exact: false, priority: 4 }
      );
    } else if (driverType === 'mobilidade_reduzida') {
      baseTabs.push(
        { path: '/custos', icon: 'fa-wallet', label: 'Custos', exact: false, priority: 4 }
      );
    } else {
      // Regular
      baseTabs.push(
        { path: '/custos', icon: 'fa-wallet', label: 'Custos', exact: false, priority: 4 }
      );
    }

  const tabs = profile === 'gestor' ? gestorTabs : profile === 'tecnico' ? tecnicoTabs : condutorTabs;

  const isActive = (path: string, exact: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card border-t border-border shadow-[0_-4px_16px_rgba(0,0,0,0.1)] transition-colors duration-300"
      role="navigation"
      aria-label="Navegação principal"
    >
      <div className="flex items-stretch h-16">
        {tabs.map((tab) => {
          const active = isActive(tab.path, tab.exact);
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
              ></i>
              <span style={{ fontSize: '11px', lineHeight: 1 }}>
                {tab.label}
              </span>
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