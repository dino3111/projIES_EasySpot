import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import { FilterBar } from '../components/FilterBar';
import { ParkingCard } from '../components/ParkingCard';
import { mockParkingLots, simulateRealTimeUpdate, type ParkingLot } from '../data/parkingData';

export function ListaPage() {
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>(mockParkingLots);
  const [showEVOnly, setShowEVOnly] = useState(false);
  const [showAccessibleOnly, setShowAccessibleOnly] = useState(false);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // Mobile usa lista compacta; desktop usa grid de cards
  const [mobileView, setMobileView] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    const interval = setInterval(() => {
      setParkingLots((current) =>
        current.map((lot) => (Math.random() > 0.5 ? simulateRealTimeUpdate(lot) : lot))
      );
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    return parkingLots.filter((lot) => {
      if (showEVOnly && (!lot.hasEVCharger || !lot.evChargers || lot.evChargers.length === 0)) return false;
      if (showAccessibleOnly && (!lot.hasAccessible || !lot.accessibleSpots || lot.accessibleSpots.length === 0)) return false;
      if (showAvailableOnly && lot.availableSpots === 0) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!lot.name.toLowerCase().includes(q) && !lot.address.toLowerCase().includes(q))
          return false;
      }
      return true;
    });
  }, [parkingLots, showEVOnly, showAccessibleOnly, showAvailableOnly, searchQuery]);

  const totalAccessible = filtered.reduce(
    (s, l) => s + (l.accessibleSpots?.filter((a) => a.available).length ?? 0),
    0
  );

  const closestAccDistance = showAccessibleOnly
    ? filtered.reduce((min, lot) => {
        const best = lot.accessibleSpots
          ?.filter((s) => s.available)
          .sort((a, b) => a.distanceToEntrance - b.distanceToEntrance)[0];
        if (!best) return min;
        return min === null || best.distanceToEntrance < min ? best.distanceToEntrance : min;
      }, null as number | null)
    : null;

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-5 h-full transition-colors duration-300">
      {/* Título da página */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1
          className="text-foreground"
          style={{ fontSize: '1.75rem', fontWeight: 800, lineHeight: 1.2 }}
        >
          Estacionamento
        </h1>
        {/* Toggle de vista (apenas visível em mobile) */}
        <div className="flex sm:hidden gap-1 p-0.5 bg-muted rounded-lg">
          <button
            onClick={() => setMobileView('list')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              mobileView === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
            aria-pressed={mobileView === 'list'}
            aria-label="Vista em lista"
          >
            <i className="fas fa-list-ul" aria-hidden="true" />
          </button>
          <button
            onClick={() => setMobileView('grid')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              mobileView === 'grid' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
            aria-pressed={mobileView === 'grid'}
            aria-label="Vista em grelha"
          >
            <i className="fas fa-grid-2" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-4">
        <FilterBar
          showEVOnly={showEVOnly}
          showAccessibleOnly={showAccessibleOnly}
          showAvailableOnly={showAvailableOnly}
          searchQuery={searchQuery}
          onEVFilterChange={setShowEVOnly}
          onAccessibleFilterChange={setShowAccessibleOnly}
          onAvailableFilterChange={setShowAvailableOnly}
          onSearchChange={setSearchQuery}
        />
      </div>

      {/* Alerta de acessibilidade */}
      {showAccessibleOnly && (
        <div
          className="rounded-xl px-4 py-3 mb-4 bg-primary/10 border border-primary/30"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3 mb-2">
            <i className="fas fa-wheelchair-move mt-0.5 flex-shrink-0 text-primary" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-foreground" style={{ fontSize: '0.8rem', fontWeight: 700 }}>Lugares Acessíveis</p>
              <p className="text-foreground/60" style={{ fontSize: '0.75rem' }}>
                {totalAccessible > 0
                  ? `${totalAccessible} lugar${totalAccessible !== 1 ? 'es' : ''} acessível${totalAccessible !== 1 ? 'is' : ''} disponível${totalAccessible !== 1 ? 'is' : ''}.${closestAccDistance !== null ? ` Mais próximo: ${closestAccDistance}m à entrada.` : ''}`
                  : 'Sem lugares acessíveis disponíveis de momento.'}
              </p>
            </div>
          </div>
          {/* Legenda de distâncias */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-foreground/60 font-semibold" style={{ fontSize: '0.68rem' }}>Distância à entrada:</span>
            {[
              { color: 'bg-success', label: '≤ 20m' },
              { color: 'bg-warning', label: '20–40m' },
              { color: 'bg-error', label: '> 40m' },
            ].map((item) => (
              <span key={item.label} className="flex items-center gap-1" style={{ fontSize: '0.68rem' }}>
                <span className={`inline-block w-2.5 h-2.5 rounded-sm ${item.color}`} aria-hidden="true" />
                <span className="text-foreground">{item.label}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Lista de parques */}
      {filtered.length > 0 ? (
        <>
          <p
            className="mb-3 text-muted-foreground font-medium"
            style={{ fontSize: '0.8rem' }}
            role="status"
            aria-live="polite"
          >
            {filtered.length} parque{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          </p>

          {/* Vista mobile em lista compacta */}
          <div
            className={`space-y-2 ${mobileView === 'grid' ? 'hidden' : 'flex flex-col'} sm:hidden`}
            role="list"
            aria-label="Lista de parques de estacionamento"
          >
            {filtered.map((lot) => (
              <div key={lot.id} role="listitem">
                <CompactParkRow lot={lot} highlightAccessible={showAccessibleOnly} />
              </div>
            ))}
          </div>

          {/* Vista mobile grid / desktop grid */}
          <div
            className={`grid gap-3 lg:gap-4 ${
              mobileView === 'grid'
                ? 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                : 'hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            }`}
            role="list"
            aria-label="Grelha de parques de estacionamento"
          >
            {filtered.map((lot) => (
              <div key={lot.id} role="listitem">
                <ParkingCard lot={lot} highlightAccessible={showAccessibleOnly} />
              </div>
            ))}
          </div>
        </>
      ) : (
        <div
          className="flex flex-col items-center justify-center text-center rounded-2xl p-10 bg-primary/5 border-2 border-dashed border-primary/30"
          role="status"
        >
          <i
            className="fas fa-magnifying-glass mb-3 text-primary/50"
            style={{ fontSize: '2.5rem' }}
            aria-hidden="true"
          />
          <p className="text-foreground font-bold" style={{ fontSize: '1rem' }}>
            Nenhum parque encontrado
          </p>
          <p className="text-foreground/60 mt-1" style={{ fontSize: '0.85rem' }}>
            Tente ajustar os filtros ou a pesquisa.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Linha compacta de parque (vista mobile) ─────────────────────────── */
function CompactParkRow({ lot, highlightAccessible }: { lot: ParkingLot; highlightAccessible: boolean }) {
  const isFull = lot.availableSpots === 0;
  const isAlmostFull = lot.availableSpots > 0 && lot.availableSpots <= Math.ceil(lot.totalSpots * 0.2);
  const statusColor = isFull ? '#ef4444' : isAlmostFull ? '#f59e0b' : '#22c55e';
  const statusLabel = isFull ? 'Lotado' : isAlmostFull ? 'Quase cheio' : 'Disponível';
  const occupancyPct = Math.round(((lot.totalSpots - lot.availableSpots) / lot.totalSpots) * 100);

  return (
    <Link
      to={`/parque/${lot.id}`}
      className="block no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
      aria-label={`Ver detalhes do ${lot.name}. ${lot.availableSpots} lugares disponíveis de ${lot.totalSpots}.`}
    >
      <article
        className={`flex items-center gap-3 rounded-xl px-3 py-3 bg-card border transition-all hover:shadow-md ${
          highlightAccessible ? 'border-primary/40' : 'border-border'
        }`}
      >
        {/* Indicador de disponibilidade */}
        <div
          className="w-11 h-11 rounded-xl flex-shrink-0 flex flex-col items-center justify-center"
          style={{ background: statusColor }}
          aria-hidden="true"
        >
          <span className="text-white font-extrabold text-sm leading-none">{lot.availableSpots}</span>
          <span className="text-white/80 font-medium leading-none" style={{ fontSize: '0.5rem', marginTop: '2px' }}>
            /{lot.totalSpots}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded text-white"
              style={{ background: statusColor }}
            >
              {statusLabel}
            </span>
            {lot.hasEVCharger && lot.evChargers && lot.evChargers.length > 0 && (
              <i className="fas fa-charging-station text-muted-foreground text-[0.65rem]" title="Carregamento EV" />
            )}
            {lot.hasAccessible && lot.accessibleSpots && lot.accessibleSpots.length > 0 && (
              <i
                className="fas fa-wheelchair text-[0.65rem]"
                style={{ color: highlightAccessible ? 'var(--color-primary)' : 'var(--muted-foreground)' }}
                title="Lugares Acessíveis"
              />
            )}
          </div>
          <h2 className="text-foreground font-bold text-sm leading-tight truncate">{lot.name}</h2>
          <p className="text-muted-foreground text-xs truncate mt-0.5 flex items-center gap-1">
            <i className="fas fa-location-dot text-[0.6rem]" aria-hidden="true" />
            {lot.address}
          </p>
          {/* Barra de progresso fina */}
          <div className="h-1 bg-muted rounded-full overflow-hidden mt-1.5">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${occupancyPct}%`, background: statusColor }}
            />
          </div>
        </div>

        {/* Preço e distância */}
        <div className="text-right flex-shrink-0">
          <span className="block font-extrabold text-foreground text-sm">€{lot.hourlyRate.toFixed(2)}</span>
          <span className="text-[0.6rem] text-muted-foreground uppercase">/hora</span>
          <span className="flex items-center gap-1 text-muted-foreground text-xs mt-1 justify-end">
            <i className="fas fa-person-walking text-[0.6rem]" aria-hidden="true" />
            {lot.walkingTime}
          </span>
        </div>

        <i className="fas fa-chevron-right text-muted-foreground/40 text-xs flex-shrink-0" aria-hidden="true" />
      </article>
    </Link>
  );
}