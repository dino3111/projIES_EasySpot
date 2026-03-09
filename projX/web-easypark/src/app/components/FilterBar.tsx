import { useState } from 'react';

interface FilterBarProps {
  showEVOnly: boolean;
  showAccessibleOnly: boolean;
  showAvailableOnly: boolean;
  searchQuery: string;
  onEVFilterChange: (value: boolean) => void;
  onAccessibleFilterChange: (value: boolean) => void;
  onAvailableFilterChange: (value: boolean) => void;
  onSearchChange: (value: string) => void;
}

export function FilterBar({
  showEVOnly,
  showAccessibleOnly,
  showAvailableOnly,
  searchQuery,
  onEVFilterChange,
  onAccessibleFilterChange,
  onAvailableFilterChange,
  onSearchChange,
}: FilterBarProps) {
  const activeCount = [showEVOnly, showAccessibleOnly, showAvailableOnly].filter(Boolean).length;
  // No mobile, os filtros começam ocultos; no desktop ficam sempre visíveis via CSS
  const [filtersVisible, setFiltersVisible] = useState(false);

  return (
    <div role="region" aria-label="Pesquisa e filtros">
      {/* Barra de pesquisa */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <i
            className="fas fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-primary/60"
            aria-hidden="true"
            style={{ fontSize: '0.9rem' }}
          />
          <input
            type="search"
            className="w-full rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-foreground bg-card border border-border placeholder:text-muted-foreground/60"
            style={{ fontSize: '0.9rem' }}
            placeholder="Pesquisar parque ou zona..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Pesquisar parques"
          />
          {searchQuery && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => onSearchChange('')}
              aria-label="Limpar pesquisa"
            >
              <i className="fas fa-xmark" aria-hidden="true" />
            </button>
          )}
        </div>
        {/* Botão de filtros – toggle no mobile, decorativo (sem click) em desktop pois filtros estão sempre visíveis */}
        <button
          className={`sm:hidden flex-shrink-0 w-12 flex flex-col items-center justify-center rounded-xl border transition-colors relative ${
            activeCount > 0 || filtersVisible
              ? 'bg-primary border-primary text-white'
              : 'bg-card border-border text-muted-foreground'
          }`}
          onClick={() => setFiltersVisible((v) => !v)}
          aria-label={filtersVisible ? 'Ocultar filtros' : 'Mostrar filtros'}
          aria-expanded={filtersVisible}
        >
          <i className="fas fa-sliders text-base" aria-hidden="true" />
          {activeCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-warning text-black text-[0.55rem] font-black flex items-center justify-center leading-none">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Filtros em chips - visíveis sempre em ≥sm, toggle em mobile */}
      <div
        className={`flex flex-wrap gap-2 transition-all duration-200 ${
          filtersVisible ? 'flex' : 'hidden sm:flex'
        }`}
        role="group"
        aria-label="Filtros activos"
      >
        <FilterChip
          active={showAvailableOnly}
          icon="fa-circle-check"
          label="Com Lugares"
          onClick={() => onAvailableFilterChange(!showAvailableOnly)}
          ariaLabel={showAvailableOnly ? 'Remover filtro: apenas com lugares disponíveis' : 'Filtrar apenas com lugares disponíveis'}
        />
        <FilterChip
          active={showEVOnly}
          icon="fa-charging-station"
          label="Carregador EV"
          onClick={() => onEVFilterChange(!showEVOnly)}
          ariaLabel={showEVOnly ? 'Remover filtro: apenas com carregadores EV' : 'Filtrar apenas com carregadores EV'}
        />
        <FilterChip
          active={showAccessibleOnly}
          icon="fa-wheelchair"
          label="Acessível"
          onClick={() => onAccessibleFilterChange(!showAccessibleOnly)}
          ariaLabel={showAccessibleOnly ? 'Remover filtro: apenas acessíveis' : 'Filtrar apenas parques acessíveis'}
        />

        {activeCount > 0 && (
          <button
            onClick={() => {
              onEVFilterChange(false);
              onAccessibleFilterChange(false);
              onAvailableFilterChange(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all bg-transparent border border-dashed border-error/60 text-error font-medium hover:bg-error/5"
            style={{ fontSize: '0.75rem' }}
            aria-label="Limpar todos os filtros activos"
          >
            <i className="fas fa-xmark" aria-hidden="true" />
            Limpar ({activeCount})
          </button>
        )}
      </div>
    </div>
  );
}

interface FilterChipProps {
  active: boolean;
  icon: string;
  label: string;
  onClick: () => void;
  ariaLabel: string;
}

function FilterChip({ active, icon, label, onClick, ariaLabel }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all border text-[0.8rem] ${
        active
          ? 'bg-primary border-primary text-white font-semibold shadow-sm shadow-primary/20'
          : 'bg-card border-border text-muted-foreground font-medium hover:border-primary/40 hover:text-primary'
      }`}
      aria-pressed={active}
      aria-label={ariaLabel}
    >
      <i className={`fas ${icon}`} aria-hidden="true" style={{ fontSize: '0.75rem' }} />
      {label}
    </button>
  );
}
