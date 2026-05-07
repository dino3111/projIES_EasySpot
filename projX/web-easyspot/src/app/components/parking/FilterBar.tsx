import { useState } from 'react';

interface FilterBarProps {
  showEVOnly: boolean;
  showAccessibleOnly: boolean;
  showAvailableOnly: boolean;
  searchQuery: string;
  selectedDistrict: string;
  districts: string[];
  onEVFilterChange: (value: boolean) => void;
  onAccessibleFilterChange: (value: boolean) => void;
  onAvailableFilterChange: (value: boolean) => void;
  onSearchChange: (value: string) => void;
  onDistrictChange: (value: string) => void;
}

export function FilterBar({
  showEVOnly,
  showAccessibleOnly,
  showAvailableOnly,
  searchQuery,
  selectedDistrict,
  districts,
  onEVFilterChange,
  onAccessibleFilterChange,
  onAvailableFilterChange,
  onSearchChange,
  onDistrictChange,
}: FilterBarProps) {
  const activeCount =
    [showEVOnly, showAccessibleOnly, showAvailableOnly].filter(Boolean).length +
    (selectedDistrict ? 1 : 0);

  const [filtersVisible, setFiltersVisible] = useState(false);

  return (
    <section aria-label="Pesquisa e filtros">
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

        <div className="relative hidden sm:block">
          <i
            className="fas fa-map-location-dot absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-primary/60"
            aria-hidden="true"
            style={{ fontSize: '0.8rem' }}
          />
          <select
            value={selectedDistrict}
            onChange={(e) => onDistrictChange(e.target.value)}
            className={`h-full rounded-xl pl-8 pr-7 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all border appearance-none cursor-pointer bg-card text-foreground ${
              selectedDistrict
                ? 'border-primary text-primary font-semibold'
                : 'border-border text-muted-foreground'
            }`}
            style={{ fontSize: '0.85rem', minWidth: '9rem' }}
            aria-label="Filtrar por localidade"
          >
            <option value="">Todos os lugares</option>
            {districts.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <i
            className="fas fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground"
            aria-hidden="true"
            style={{ fontSize: '0.65rem' }}
          />
        </div>

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

        <div className="relative sm:hidden">
          <i
            className="fas fa-map-location-dot absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
            style={{ fontSize: '0.72rem', color: selectedDistrict ? 'white' : 'var(--muted-foreground)' }}
          />
          <select
            value={selectedDistrict}
            onChange={(e) => onDistrictChange(e.target.value)}
            className={`rounded-full pl-7 pr-6 py-1.5 border appearance-none cursor-pointer text-[0.8rem] font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 ${
              selectedDistrict
                ? 'bg-primary border-primary text-white font-semibold shadow-sm shadow-primary/20'
                : 'bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-primary'
            }`}
            aria-label="Filtrar por localidade"
          >
            <option value="">Lugar</option>
            {districts.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <i
            className="fas fa-chevron-down absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
            style={{ fontSize: '0.6rem', color: selectedDistrict ? 'white' : 'var(--muted-foreground)' }}
          />
        </div>

        {activeCount > 0 && (
          <button
            onClick={() => {
              onEVFilterChange(false);
              onAccessibleFilterChange(false);
              onAvailableFilterChange(false);
              onDistrictChange('');
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
    </section>
  );
}

interface FilterChipProps {
  readonly active: boolean;
  readonly icon: string;
  readonly label: string;
  readonly onClick: () => void;
  readonly ariaLabel: string;
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
