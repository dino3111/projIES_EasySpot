import { Link } from 'react-router';
import { getSpotDimCategory, getDistanceColor, type ParkingLot } from '../../../data/parkingTypes';
import type { FilterMode } from '../../../components/parking/ParkingCard';

interface CompactParkRowProps {
  lot: ParkingLot;
  filterMode: FilterMode;
}

export function CompactParkRow({ lot, filterMode }: CompactParkRowProps) {
  const evAvail  = lot.evChargers?.filter((c) => c.available).length ?? 0;
  const evTotal  = lot.evChargers?.length ?? 0;
  const accAvail = lot.accessibleSpots?.filter((s) => s.available).length ?? 0;
  const accTotal = lot.accessibleSpots?.length ?? 0;

  const closestAvailAcc = lot.accessibleSpots
    ?.filter((s) => s.available)
    .sort((a, b) => a.distanceToEntrance - b.distanceToEntrance)[0];
  const dimCat = closestAvailAcc ? getSpotDimCategory(closestAvailAcc.dimensions) : null;

  const ctx = buildContext({ lot, filterMode, evAvail, evTotal, accAvail, accTotal });
  const barPct = ctx.total > 0 ? Math.round((ctx.avail / ctx.total) * 100) : 0;

  return (
    <Link
      to={`/parking/${lot.id}`}
      className="block no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
      aria-label={`Ver detalhes do ${lot.name}.`}
    >
      <article className={`flex items-center gap-3 rounded-xl px-3 py-3 bg-card border transition-all hover:shadow-md ${ctx.borderCls}`}>
        <SpotIndicator ctx={ctx} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: ctx.color }}>
              {ctx.label}
            </span>
            {lot.hasEVCharger && evTotal > 0 && (
              <i
                className="fas fa-charging-station text-[0.65rem]"
                style={{ color: filterMode === 'ev' || filterMode === 'both' ? '#22c55e' : 'var(--color-muted-foreground)' }}
              />
            )}
            {lot.hasAccessible && accTotal > 0 && (
              <i
                className="fas fa-wheelchair text-[0.65rem]"
                style={{ color: filterMode === 'accessible' || filterMode === 'both' ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }}
              />
            )}
          </div>
          <h2 className="text-foreground font-bold leading-tight truncate" style={{ fontSize: '0.875rem' }}>{lot.name}</h2>
          <p className="text-muted-foreground truncate flex items-center gap-1" style={{ fontSize: '0.7rem' }}>
            <i className="fas fa-location-dot text-[0.6rem]" />
            {lot.address}
          </p>

          <div className="h-1 bg-muted rounded-full overflow-hidden mt-1.5">
            <div className="h-full rounded-full transition-all" style={{ width: `${barPct}%`, background: ctx.color }} />
          </div>

          {(filterMode === 'accessible' || filterMode === 'both') && closestAvailAcc && (
            <AccessibleBadges
              closestAvailAcc={closestAvailAcc}
              dimCat={dimCat}
              filterMode={filterMode}
              evAvail={evAvail}
              evTotal={evTotal}
            />
          )}

          {filterMode === 'ev' && (
            <p className="mt-0.5" style={{ fontSize: '0.62rem', color: ctx.color, fontWeight: 600 }}>
              {ctx.avail}/{ctx.total} carregadores livres
            </p>
          )}
        </div>

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

interface CtxData {
  avail: number;
  total: number;
  color: string;
  label: string;
  icon: string | null;
  borderCls: string;
}

function buildContext({ lot, filterMode, evAvail, evTotal, accAvail, accTotal }: {
  lot: ParkingLot; filterMode: FilterMode;
  evAvail: number; evTotal: number; accAvail: number; accTotal: number;
}): CtxData {
  if (filterMode === 'ev' && evTotal > 0) {
    const isFull = evAvail === 0;
    return {
      avail: evAvail, total: evTotal,
      color: isFull ? '#ef4444' : evAvail <= Math.ceil(evTotal * 0.3) ? '#f59e0b' : '#22c55e',
      label: isFull ? 'Sem EV' : 'EV livre',
      icon: 'fa-charging-station', borderCls: 'border-green-400/40',
    };
  }
  if ((filterMode === 'accessible' || filterMode === 'both') && accTotal > 0) {
    const isFull = accAvail === 0;
    return {
      avail: accAvail, total: accTotal,
      color: isFull ? '#ef4444' : accAvail <= Math.ceil(accTotal * 0.3) ? '#f59e0b' : '#7357ec',
      label: isFull ? 'Sem acess.' : 'Acessível',
      icon: 'fa-wheelchair', borderCls: 'border-primary/40',
    };
  }
  const isFull = lot.availableSpots === 0;
  const isAlmost = !isFull && lot.availableSpots <= Math.ceil(lot.totalSpots * 0.2);
  return {
    avail: lot.availableSpots, total: lot.totalSpots,
    color: isFull ? '#ef4444' : isAlmost ? '#f59e0b' : '#22c55e',
    label: isFull ? 'Lotado' : isAlmost ? 'Quase cheio' : 'Disponível',
    icon: null, borderCls: 'border-border',
  };
}

function SpotIndicator({ ctx }: { ctx: CtxData }) {
  return (
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
  );
}

interface AccessibleBadgesProps {
  closestAvailAcc: { distanceToEntrance: number; dimensions: string };
  dimCat: ReturnType<typeof getSpotDimCategory> | null;
  filterMode: FilterMode;
  evAvail: number;
  evTotal: number;
}

function AccessibleBadges({ closestAvailAcc, dimCat, filterMode, evAvail, evTotal }: AccessibleBadgesProps) {
  return (
    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
      <span
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-white font-bold"
        style={{ background: getDistanceColor(closestAvailAcc.distanceToEntrance).bg, fontSize: '0.62rem' }}
      >
        <i className="fas fa-door-open" style={{ fontSize: '0.55rem' }} />
        {closestAvailAcc.distanceToEntrance}m
      </span>
      {dimCat && (
        <span
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-bold border ${dimCat.bgClass} ${dimCat.textClass}`}
          style={{ fontSize: '0.62rem', borderColor: 'currentColor' }}
        >
          <i className={`fas ${dimCat.icon}`} style={{ fontSize: '0.5rem' }} />
          {dimCat.label}
        </span>
      )}
      {filterMode === 'both' && evTotal > 0 && (
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-bold"
          style={{
            background: evAvail > 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)',
            color: evAvail > 0 ? '#22c55e' : '#ef4444',
            fontSize: '0.62rem',
            border: `1px solid ${evAvail > 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}
        >
          <i className="fas fa-charging-station" style={{ fontSize: '0.5rem' }} />
          {evAvail}/{evTotal}
        </span>
      )}
    </div>
  );
}
