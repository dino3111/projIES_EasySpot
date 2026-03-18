import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import { FilterBar } from '../../components/parking/FilterBar';
import { ParkingCard, type FilterMode } from '../../components/parking/ParkingCard';
import { VehiclePicker } from '../../components/shared/VehiclePicker';
import { mockParkingLots, simulateRealTimeUpdate, getSpotDimCategory, getDistanceColor, type ParkingLot } from '../../data/parkingData';
import { useProfile } from '../../context/ProfileContext';

export function ListaPage() {
  const { vehicles } = useProfile();
  const primaryVehicle = vehicles.find((v) => v.isPrimary) ?? vehicles[0] ?? null;

  const [parkingLots, setParkingLots] = useState<ParkingLot[]>(mockParkingLots);
  const [showEVOnly, setShowEVOnly] = useState(false);
  const [showAccessibleOnly, setShowAccessibleOnly] = useState(false);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'grid'>('list');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(primaryVehicle?.id ?? null);

  useEffect(() => {
    const vehicle = vehicles.find((v) => v.id === selectedVehicleId) ?? null;
    setShowEVOnly(vehicle?.isEV ?? false);
    setShowAccessibleOnly(vehicle?.isAccessible ?? false);
  }, [selectedVehicleId, vehicles]);

  // Filtro contextual
  const filterMode: FilterMode =
    showAccessibleOnly && showEVOnly ? 'both'
    : showAccessibleOnly ? 'accessible'
    : showEVOnly ? 'ev'
    : null;

  useEffect(() => {
    const interval = setInterval(() => {
      setParkingLots((current) =>
        current.map((lot) => (Math.random() > 0.5 ? simulateRealTimeUpdate(lot) : lot))
      );
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const districts = useMemo(() => {
    const set = new Set(mockParkingLots.map((l) => l.localidade));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt'));
  }, []);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) ?? null,
    [vehicles, selectedVehicleId],
  );

  const filtered = useMemo(() => {
    return parkingLots.filter((lot) => {
      if (showEVOnly) {
        if (!lot.hasEVCharger || !lot.evChargers || lot.evChargers.length === 0) return false;
        if (selectedVehicle?.isEV && selectedVehicle.chargerTypes?.length) {
          const hasCompatible = lot.evChargers.some((c) => selectedVehicle.chargerTypes!.includes(c.type));
          if (!hasCompatible) return false;
        }
      }
      if (showAccessibleOnly && (!lot.hasAccessible || !lot.accessibleSpots || lot.accessibleSpots.length === 0)) return false;
      if (showAvailableOnly && lot.availableSpots === 0) return false;
      if (selectedDistrict && lot.localidade !== selectedDistrict) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!lot.name.toLowerCase().includes(q) && !lot.address.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [parkingLots, showEVOnly, showAccessibleOnly, showAvailableOnly, selectedDistrict, searchQuery, selectedVehicle]);

  const totalAccessible = filtered.reduce(
    (s, l) => s + (l.accessibleSpots?.filter((a) => a.available).length ?? 0), 0
  );
  const totalEV = filtered.reduce(
    (s, l) => s + (l.evChargers?.filter((c) => c.available).length ?? 0), 0
  );
  const closestAccDistance = showAccessibleOnly
    ? filtered.reduce((min, lot) => {
        const best = lot.accessibleSpots?.filter((s) => s.available)
          .sort((a, b) => a.distanceToEntrance - b.distanceToEntrance)[0];
        if (!best) return min;
        return min === null || best.distanceToEntrance < min ? best.distanceToEntrance : min;
      }, null as number | null)
    : null;

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-5 h-full transition-colors duration-300">
      {/* Título */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-foreground" style={{ fontSize: '1.75rem', fontWeight: 800, lineHeight: 1.2 }}>
          Estacionamento
        </h1>
        <div className="flex sm:hidden gap-1 p-0.5 bg-muted rounded-lg">
          <button
            onClick={() => setMobileView('list')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${mobileView === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
            aria-pressed={mobileView === 'list'} aria-label="Vista em lista"
          >
            <i className="fas fa-list-ul" aria-hidden="true" />
          </button>
          <button
            onClick={() => setMobileView('grid')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${mobileView === 'grid' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
            aria-pressed={mobileView === 'grid'} aria-label="Vista em grelha"
          >
            <i className="fas fa-grid-2" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Seletor de Veículo */}
      {vehicles.length > 0 && (
        <div className="mb-3">
          <VehiclePicker
            vehicles={vehicles}
            selectedId={selectedVehicleId}
            onSelect={setSelectedVehicleId}
          />
        </div>
      )}

      {/* Filtros */}
      <div className="mb-4">
        <FilterBar
          showEVOnly={showEVOnly} showAccessibleOnly={showAccessibleOnly}
          showAvailableOnly={showAvailableOnly} searchQuery={searchQuery}
          selectedDistrict={selectedDistrict} districts={districts}
          onEVFilterChange={setShowEVOnly} onAccessibleFilterChange={setShowAccessibleOnly}
          onAvailableFilterChange={setShowAvailableOnly} onSearchChange={setSearchQuery}
          onDistrictChange={setSelectedDistrict}
        />
      </div>

      {/* ── Banner: Ambos os filtros activos ─────────────────────────────── */}
      {filterMode === 'both' && (
        <div
          className="rounded-xl px-4 py-3.5 mb-4 border"
          style={{
            background: 'linear-gradient(135deg, rgba(115,87,236,0.08) 0%, rgba(34,197,94,0.08) 100%)',
            borderColor: 'rgba(115,87,236,0.3)',
          }}
          role="status" aria-live="polite"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1">
              <i className="fas fa-wheelchair text-primary" style={{ fontSize: '0.9rem' }} />
              <span className="text-primary font-bold" style={{ fontSize: '0.75rem' }}>+</span>
              <i className="fas fa-charging-station" style={{ color: '#22c55e', fontSize: '0.9rem' }} />
            </div>
            <p className="text-foreground font-bold" style={{ fontSize: '0.85rem' }}>
              Acessível &amp; Carregamento EV
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2.5 rounded-lg px-3 py-2 bg-primary/8 border border-primary/20">
              <i className="fas fa-wheelchair text-primary" style={{ fontSize: '1rem' }} />
              <div>
                <p className="text-muted-foreground" style={{ fontSize: '0.65rem', fontWeight: 600 }}>LUGARES ACESSÍVEIS</p>
                <p className="text-primary font-extrabold" style={{ fontSize: '1.1rem', lineHeight: 1 }}>
                  {totalAccessible}
                  <span className="text-muted-foreground font-medium" style={{ fontSize: '0.7rem' }}> livres</span>
                </p>
              </div>
            </div>
            <div
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 border"
              style={{ background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.25)' }}
            >
              <i className="fas fa-charging-station" style={{ color: '#22c55e', fontSize: '1rem' }} />
              <div>
                <p className="text-muted-foreground" style={{ fontSize: '0.65rem', fontWeight: 600 }}>CARREGADORES EV</p>
                <p className="font-extrabold" style={{ fontSize: '1.1rem', lineHeight: 1, color: '#22c55e' }}>
                  {totalEV}
                  <span className="text-muted-foreground font-medium" style={{ fontSize: '0.7rem' }}> livres</span>
                </p>
              </div>
            </div>
          </div>
          {closestAccDistance !== null && (
            <p className="text-muted-foreground mt-2" style={{ fontSize: '0.72rem' }}>
              <i className="fas fa-door-open mr-1 text-primary" />
              Lugar acessível mais próximo de uma entrada:{' '}
              <span className="font-bold text-foreground">{closestAccDistance}m</span>
            </p>
          )}
        </div>
      )}

      {/* ── Banner: Apenas Acessíveis ─────────────────────────────────────── */}
      {filterMode === 'accessible' && (
        <div className="rounded-xl px-4 py-3 mb-4 bg-primary/10 border border-primary/30" role="status" aria-live="polite">
          <div className="flex items-start gap-3 mb-2">
            <i className="fas fa-wheelchair-move mt-0.5 flex-shrink-0 text-primary" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-foreground" style={{ fontSize: '0.8rem', fontWeight: 700 }}>Lugares Acessíveis Disponíveis</p>
              <p className="text-foreground/70" style={{ fontSize: '0.75rem' }}>
                {totalAccessible > 0
                  ? `${totalAccessible} lugar${totalAccessible !== 1 ? 'es' : ''} livre${totalAccessible !== 1 ? 's' : ''} nos ${filtered.length} parque${filtered.length !== 1 ? 's' : ''} filtrados.${closestAccDistance !== null ? ` Mais próximo: ${closestAccDistance}m da entrada.` : ''}`
                  : 'Sem lugares acessíveis disponíveis de momento.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-foreground/60 font-semibold" style={{ fontSize: '0.68rem' }}>Distância à entrada:</span>
            {[{ color: '#22c55e', label: '≤ 20m' }, { color: '#f59e0b', label: '20–40m' }, { color: '#ef4444', label: '> 40m' }].map((item) => (
              <span key={item.label} className="flex items-center gap-1" style={{ fontSize: '0.68rem' }}>
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: item.color }} />
                <span className="text-foreground">{item.label}</span>
              </span>
            ))}
            <span className="mx-1 text-border">|</span>
            <span className="text-foreground/60 font-semibold" style={{ fontSize: '0.68rem' }}>Dimensão:</span>
            {[
              { cls: 'text-success', label: 'Amplo ≥4m' },
              { cls: 'text-info', label: 'Standard 3.5m' },
              { cls: 'text-warning', label: 'Compacto <3.5m' },
            ].map((item) => (
              <span key={item.label} className={`font-semibold ${item.cls}`} style={{ fontSize: '0.68rem' }}>{item.label}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── Banner: Apenas EV ────────────────────────────────────────────── */}
      {filterMode === 'ev' && (
        <div className="rounded-xl px-4 py-3 mb-4 border" style={{ background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.3)' }} role="status" aria-live="polite">
          <div className="flex items-center gap-3">
            <i className="fas fa-charging-station flex-shrink-0" style={{ color: '#22c55e' }} />
            <div>
              <p className="text-foreground" style={{ fontSize: '0.8rem', fontWeight: 700 }}>Carregadores EV Disponíveis</p>
              <p className="text-foreground/60" style={{ fontSize: '0.75rem' }}>
                {totalEV > 0
                  ? `${totalEV} carregador${totalEV !== 1 ? 'es' : ''} livre${totalEV !== 1 ? 's' : ''} nos ${filtered.length} parque${filtered.length !== 1 ? 's' : ''} filtrados.`
                  : 'Sem carregadores EV disponíveis de momento.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Lista de parques */}
      {filtered.length > 0 ? (
        <>
          <p className="mb-3 text-muted-foreground font-medium" style={{ fontSize: '0.8rem' }} role="status" aria-live="polite">
            {filtered.length} parque{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
            {filterMode === 'accessible' && (
              <span className="ml-1.5 text-primary font-semibold">
                · {totalAccessible} lugar{totalAccessible !== 1 ? 'es' : ''} acessível{totalAccessible !== 1 ? 'is' : ''} livre{totalAccessible !== 1 ? 's' : ''}
              </span>
            )}
            {filterMode === 'ev' && (
              <span className="ml-1.5 font-semibold" style={{ color: '#22c55e' }}>
                · {totalEV} carregador{totalEV !== 1 ? 'es' : ''} livre{totalEV !== 1 ? 's' : ''}
              </span>
            )}
            {filterMode === 'both' && (
              <span className="ml-1.5 text-primary font-semibold">
                · {totalAccessible} acessível{totalAccessible !== 1 ? 'is' : ''} · {totalEV} EV
              </span>
            )}
          </p>

          {/* Vista mobile lista compacta */}
          <div className={`space-y-2 ${mobileView === 'grid' ? 'hidden' : 'flex flex-col'} sm:hidden`} role="list">
            {filtered.map((lot) => (
              <div key={lot.id} role="listitem">
                <CompactParkRow lot={lot} filterMode={filterMode} />
              </div>
            ))}
          </div>

          {/* Vista grid */}
          <div
            className={`grid gap-3 lg:gap-4 ${
              mobileView === 'grid'
                ? 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                : 'hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            }`}
            style={{ alignItems: 'stretch' }}
            role="list"
          >
            {filtered.map((lot) => (
              <div key={lot.id} role="listitem" className="flex flex-col">
                <ParkingCard lot={lot} highlightAccessible={showAccessibleOnly} filterMode={filterMode} />
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center text-center rounded-2xl p-10 bg-primary/5 border-2 border-dashed border-primary/30" role="status">
          <i className="fas fa-magnifying-glass mb-3 text-primary/50" style={{ fontSize: '2.5rem' }} aria-hidden="true" />
          <p className="text-foreground font-bold" style={{ fontSize: '1rem' }}>Nenhum parque encontrado</p>
          <p className="text-foreground/60 mt-1" style={{ fontSize: '0.85rem' }}>Tente ajustar os filtros ou a pesquisa.</p>
        </div>
      )}
    </div>
  );
}

/* ── Linha compacta (mobile) ────────────────────────────────────────────── */
function CompactParkRow({ lot, filterMode }: { lot: ParkingLot; filterMode: FilterMode }) {
  const evAvail  = lot.evChargers?.filter((c) => c.available).length ?? 0;
  const evTotal  = lot.evChargers?.length ?? 0;
  const accAvail = lot.accessibleSpots?.filter((s) => s.available).length ?? 0;
  const accTotal = lot.accessibleSpots?.length ?? 0;

  const closestAvailAcc = lot.accessibleSpots
    ?.filter((s) => s.available)
    .sort((a, b) => a.distanceToEntrance - b.distanceToEntrance)[0];
  const dimCat = closestAvailAcc ? getSpotDimCategory(closestAvailAcc.dimensions) : null;

  // Dados do quadrado colorido e barra
  const ctx = (() => {
    if (filterMode === 'ev' && evTotal > 0) {
      const isFull = evAvail === 0;
      return { avail: evAvail, total: evTotal, color: isFull ? '#ef4444' : evAvail <= Math.ceil(evTotal * 0.3) ? '#f59e0b' : '#22c55e',
        label: isFull ? 'Sem EV' : 'EV livre', icon: 'fa-charging-station', borderCls: 'border-green-400/40' };
    }
    if ((filterMode === 'accessible' || filterMode === 'both') && accTotal > 0) {
      const isFull = accAvail === 0;
      return { avail: accAvail, total: accTotal, color: isFull ? '#ef4444' : accAvail <= Math.ceil(accTotal * 0.3) ? '#f59e0b' : '#7357ec',
        label: isFull ? 'Sem acess.' : 'Acessível', icon: 'fa-wheelchair', borderCls: 'border-primary/40' };
    }
    const isFull = lot.availableSpots === 0;
    const isAlmost = !isFull && lot.availableSpots <= Math.ceil(lot.totalSpots * 0.2);
    return { avail: lot.availableSpots, total: lot.totalSpots,
      color: isFull ? '#ef4444' : isAlmost ? '#f59e0b' : '#22c55e',
      label: isFull ? 'Lotado' : isAlmost ? 'Quase cheio' : 'Disponível',
      icon: null, borderCls: 'border-border' };
  })();

  const barPct = ctx.total > 0 ? Math.round((ctx.avail / ctx.total) * 100) : 0;

  return (
    <Link
      to={`/parque/${lot.id}`}
      className="block no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
      aria-label={`Ver detalhes do ${lot.name}.`}
    >
      <article className={`flex items-center gap-3 rounded-xl px-3 py-3 bg-card border transition-all hover:shadow-md ${ctx.borderCls}`}>
        {/* Indicador numérico */}
        <div className="w-11 h-11 rounded-xl flex-shrink-0 flex flex-col items-center justify-center" style={{ background: ctx.color }}>
          {ctx.icon ? (
            <>
              <i className={`fas ${ctx.icon} text-white`} style={{ fontSize: '0.7rem' }} />
              <span className="text-white font-extrabold leading-none" style={{ fontSize: '0.8rem', marginTop: '2px' }}>{ctx.avail}</span>
            </>
          ) : (
            <>
              <span className="text-white font-extrabold leading-none" style={{ fontSize: '0.9rem' }}>{ctx.avail}</span>
              <span className="text-white/80 font-medium leading-none" style={{ fontSize: '0.5rem', marginTop: '2px' }}>/{ctx.total}</span>
            </>
          )}
        </div>

        {/* Info central */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: ctx.color }}>
              {ctx.label}
            </span>
            {lot.hasEVCharger && evTotal > 0 && (
              <i className="fas fa-charging-station text-[0.65rem]"
                style={{ color: (filterMode === 'ev' || filterMode === 'both') ? '#22c55e' : 'var(--color-muted-foreground)' }} />
            )}
            {lot.hasAccessible && accTotal > 0 && (
              <i className="fas fa-wheelchair text-[0.65rem]"
                style={{ color: (filterMode === 'accessible' || filterMode === 'both') ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }} />
            )}
          </div>
          <h2 className="text-foreground font-bold leading-tight truncate" style={{ fontSize: '0.875rem' }}>{lot.name}</h2>
          <p className="text-muted-foreground truncate flex items-center gap-1" style={{ fontSize: '0.7rem' }}>
            <i className="fas fa-location-dot text-[0.6rem]" />
            {lot.address}
          </p>

          {/* Barra de progresso */}
          <div className="h-1 bg-muted rounded-full overflow-hidden mt-1.5">
            <div className="h-full rounded-full transition-all" style={{ width: `${barPct}%`, background: ctx.color }} />
          </div>

          {/* Distância + dimensão (acessível / ambos) */}
          {(filterMode === 'accessible' || filterMode === 'both') && closestAvailAcc && (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {/* Distância */}
              <span
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-white font-bold"
                style={{ background: getDistanceColor(closestAvailAcc.distanceToEntrance).bg, fontSize: '0.62rem' }}
              >
                <i className="fas fa-door-open" style={{ fontSize: '0.55rem' }} />
                {closestAvailAcc.distanceToEntrance}m
              </span>
              {/* Dimensão */}
              {dimCat && (
                <span
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-bold border ${dimCat.bgClass} ${dimCat.textClass}`}
                  style={{ fontSize: '0.62rem', borderColor: 'currentColor' }}
                >
                  <i className={`fas ${dimCat.icon}`} style={{ fontSize: '0.5rem' }} />
                  {dimCat.label}
                </span>
              )}
              {/* EV count em modo 'both' */}
              {filterMode === 'both' && evTotal > 0 && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background: evAvail > 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)', color: evAvail > 0 ? '#22c55e' : '#ef4444', fontSize: '0.62rem', border: `1px solid ${evAvail > 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                  <i className="fas fa-charging-station" style={{ fontSize: '0.5rem' }} />
                  {evAvail}/{evTotal}
                </span>
              )}
            </div>
          )}

          {/* EV count em modo só EV */}
          {filterMode === 'ev' && (
            <p className="mt-0.5" style={{ fontSize: '0.62rem', color: ctx.color, fontWeight: 600 }}>
              {ctx.avail}/{ctx.total} carregadores livres
            </p>
          )}
        </div>

        {/* Preço e distância a pé */}
        <div className="text-right flex-shrink-0">
          <span className="block font-extrabold text-foreground" style={{ fontSize: '0.875rem' }}>€{lot.hourlyRate.toFixed(2)}</span>
          <span className="text-muted-foreground uppercase" style={{ fontSize: '0.6rem' }}>/hora</span>
          <span className="flex items-center gap-1 text-muted-foreground justify-end mt-1" style={{ fontSize: '0.7rem' }}>
            <i className="fas fa-person-walking text-[0.6rem]" /> {lot.walkingTime}
          </span>
        </div>

        <i className="fas fa-chevron-right text-muted-foreground/40 text-xs flex-shrink-0" />
      </article>
    </Link>
  );
}
