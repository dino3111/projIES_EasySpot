import { Link } from 'react-router';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { ParkingLot } from '../../data/parkingTypes';
import { getSpotDimCategory, getDistanceColor } from '../../data/parkingTypes';

export type FilterMode = 'ev' | 'accessible' | 'both' | null;

interface ParkingCardProps {
  readonly lot: ParkingLot;
  readonly highlightAccessible?: boolean;
  readonly filterMode?: FilterMode;
}

export function ParkingCard({ lot, highlightAccessible = false, filterMode = null }: ParkingCardProps) {
  const { id, name, address, availableSpots, totalSpots, hourlyRate, walkingTime,
          hasEVCharger, hasAccessible, evChargers, accessibleSpots } = lot;

  const evAvail = evChargers?.filter((c) => c.available).length ?? 0;
  const evTotal = evChargers?.length ?? 0;

  const accAvail = accessibleSpots?.filter((s) => s.available).length ?? 0;
  const accTotal = accessibleSpots?.length ?? 0;

  const closestAvailAcc = accessibleSpots
    ?.filter((s) => s.available)
    .sort((a, b) => a.distanceToEntrance - b.distanceToEntrance)[0];

  const dimCategory = closestAvailAcc
    ? getSpotDimCategory(closestAvailAcc.dimensions)
    : null;

  const getSingleCtx = () => {
    if (filterMode === 'ev' && evTotal > 0) {
      const isFull = evAvail === 0;
      const isAlmost = isFull ? false : evAvail <= Math.ceil(evTotal * 0.3);
      return {
        available: evAvail, total: evTotal,
        label: 'Carregadores', icon: 'fa-charging-station',
        accentColor: isFull ? '#ef4444' : isAlmost ? '#f59e0b' : '#22c55e',
        isFull, isAlmost,
        statusLabel: isFull ? 'Sem EV' : isAlmost ? 'Quase cheio' : 'EV livre',
      };
    }
    if (filterMode === 'accessible' && accTotal > 0) {
      const isFull = accAvail === 0;
      const isAlmost = isFull ? false : accAvail <= Math.ceil(accTotal * 0.3);
      return {
        available: accAvail, total: accTotal,
        label: 'Acessíveis', icon: 'fa-wheelchair',
        accentColor: isFull ? '#ef4444' : isAlmost ? '#f59e0b' : '#7357ec',
        isFull, isAlmost,
        statusLabel: isFull ? 'Sem acessíveis' : isAlmost ? 'Quase cheio' : 'Acessível',
      };
    }
    const isFull = availableSpots === 0;
    const isAlmost = isFull ? false : availableSpots <= Math.ceil(totalSpots * 0.2);
    return {
      available: availableSpots, total: totalSpots,
      label: 'Livres', icon: null,
      accentColor: isFull ? '#ef4444' : isAlmost ? '#f59e0b' : '#22c55e',
      isFull, isAlmost,
      statusLabel: isFull ? 'Lotado' : isAlmost ? 'Quase cheio' : 'Disponível',
    };
  };

  const singleCtx = getSingleCtx();

  const ctx = filterMode !== 'both' ? singleCtx : null;
  const pct = ctx ? (ctx.total > 0 ? Math.round((ctx.available / ctx.total) * 100) : 0) : 0;

  const getBorderClass = () => {
    if (filterMode === 'both')       return 'border-primary';
    if (filterMode === 'accessible') return 'border-primary/50 ring-1 ring-primary/20';
    if (filterMode === 'ev')         return 'border-green-400/60 ring-1 ring-green-400/15';
    return 'border-border';
  };

  const borderClass = getBorderClass();

  const defaultIsFull = availableSpots === 0;
  const defaultIsAlmost = defaultIsFull ? false : availableSpots <= Math.ceil(totalSpots * 0.2);

  const getBadgeStyle = (isFull: boolean, isAlmost: boolean) => ({
    bg: isFull ? '#ef4444' : isAlmost ? '#f59e0b' : '#22c55e',
    color: isAlmost ? '#000' : '#fff',
  });

  const defaultBadgeStyle = getBadgeStyle(defaultIsFull, defaultIsAlmost);
  const defaultBadgeLabel = defaultIsFull ? 'Lotado' : defaultIsAlmost ? 'Quase Cheio' : 'Disponível';

  const badgeStyle = ctx ? getBadgeStyle(ctx.isFull, ctx.isAlmost) : defaultBadgeStyle;
  const badgeLabel = ctx ? ctx.statusLabel : defaultBadgeLabel;

  return (
    <Link
      to={`/parking/${id}`}
      className="h-full flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl no-underline"
      aria-label={`Ver detalhes do ${name}.`}
    >
      <article className={`rounded-xl p-3.5 flex flex-col flex-1 relative bg-card border ${borderClass} hover:shadow-lg transition-all duration-200`}>

        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex gap-1.5 mb-1.5 items-center flex-wrap">
              <span
                className="px-1.5 py-0.5 rounded text-[0.65rem] font-bold uppercase inline-block"
                style={{ background: badgeStyle.bg, color: badgeStyle.color }}
              >
                {badgeLabel}
              </span>
              <div className="flex gap-1.5">
                {hasAccessible && accTotal > 0 && (
                  <i
                    className="fas fa-wheelchair"
                    style={{ color: (filterMode === 'accessible' || filterMode === 'both') ? 'var(--color-primary)' : 'var(--color-muted-foreground)', fontSize: '0.8rem' }}
                    aria-hidden="true" title="Lugares Acessíveis"
                  />
                )}
                {hasEVCharger && evTotal > 0 && (
                  <i
                    className="fas fa-charging-station"
                    style={{ color: (filterMode === 'ev' || filterMode === 'both') ? '#22c55e' : 'var(--color-muted-foreground)', fontSize: '0.8rem' }}
                    aria-hidden="true" title="Carregamento EV"
                  />
                )}
              </div>
            </div>
            <h2 className="text-foreground font-bold leading-tight line-clamp-1" style={{ fontSize: '0.95rem' }}>
              {name}
            </h2>
            <p className="flex items-center gap-1 text-muted-foreground mt-0.5 line-clamp-1" style={{ fontSize: '0.72rem' }}>
              <i className="fas fa-location-dot" aria-hidden="true" />
              {address}
            </p>
          </div>
          <div className="text-right flex-shrink-0 ml-1">
            <span className="block font-bold text-foreground" style={{ fontSize: '1rem' }}>€{hourlyRate.toFixed(2)}</span>
            <span className="text-muted-foreground uppercase" style={{ fontSize: '0.6rem' }}>/hora</span>
          </div>
        </div>

        <div className="flex-1 min-h-[6px]" />

        {filterMode === 'both' && (
          <div className="mt-2 space-y-1.5">
            <div
              className="flex items-center justify-between rounded-lg px-2.5 py-1.5"
              style={{ background: evAvail === 0 ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)', border: `1px solid ${evAvail === 0 ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)'}` }}
            >
              <div className="flex items-center gap-2">
                <i className="fas fa-charging-station" style={{ fontSize: '0.75rem', color: evAvail === 0 ? '#ef4444' : '#22c55e' }} />
                <span className="text-foreground font-semibold" style={{ fontSize: '0.75rem' }}>Carregadores EV</span>
              </div>
              <span className="font-extrabold" style={{ fontSize: '0.85rem', color: evAvail === 0 ? '#ef4444' : '#22c55e' }}>
                {evAvail}<span className="text-muted-foreground font-medium" style={{ fontSize: '0.65rem' }}>/{evTotal}</span>
              </span>
            </div>
            <div
              className="flex items-center justify-between rounded-lg px-2.5 py-1.5"
              style={{ background: accAvail === 0 ? 'rgba(239,68,68,0.08)' : 'rgba(115,87,236,0.08)', border: `1px solid ${accAvail === 0 ? 'rgba(239,68,68,0.25)' : 'rgba(115,87,236,0.25)'}` }}
            >
              <div className="flex items-center gap-2">
                <i className="fas fa-wheelchair" style={{ fontSize: '0.75rem', color: accAvail === 0 ? '#ef4444' : '#7357ec' }} />
                <span className="text-foreground font-semibold" style={{ fontSize: '0.75rem' }}>Lugares Acessíveis</span>
              </div>
              <span className="font-extrabold" style={{ fontSize: '0.85rem', color: accAvail === 0 ? '#ef4444' : '#7357ec' }}>
                {accAvail}<span className="text-muted-foreground font-medium" style={{ fontSize: '0.65rem' }}>/{accTotal}</span>
              </span>
            </div>
            {closestAvailAcc && (
              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                <DistanceBadge distance={closestAvailAcc.distanceToEntrance} />
                {dimCategory && <DimBadge category={dimCategory} />}
              </div>
            )}
          </div>
        )}

        {filterMode !== 'both' && ctx && (
          <div className="mt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative w-10 h-10 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { value: ctx.available, color: ctx.accentColor },
                          { value: Math.max(0, ctx.total - ctx.available), color: 'rgba(169,155,232,0.12)' },
                        ]}
                        cx="50%" cy="50%"
                        innerRadius={13} outerRadius={19}
                        dataKey="value" stroke="none"
                        startAngle={90} endAngle={-270}
                        isAnimationActive={false}
                      >
                        <Cell fill={ctx.accentColor} />
                        <Cell fill="rgba(169,155,232,0.12)" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    {ctx.icon ? (
                      <i className={`fas ${ctx.icon}`} style={{ fontSize: '0.5rem', color: ctx.accentColor }} />
                    ) : (
                      <span style={{ fontSize: '0.6rem', fontWeight: 800, color: ctx.accentColor }}>{pct}%</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground font-bold uppercase" style={{ fontSize: '0.6rem' }}>{ctx.label}</p>
                  <p style={{ fontSize: '1.15rem', fontWeight: 800, color: ctx.accentColor, lineHeight: 1 }}>
                    {ctx.available}
                    <span className="text-muted-foreground font-medium" style={{ fontSize: '0.65rem' }}>/{ctx.total}</span>
                  </p>
                </div>
              </div>
              <span className="flex items-center gap-1 text-muted-foreground font-medium" style={{ fontSize: '0.7rem' }}>
                <i className="fas fa-person-walking" aria-hidden="true" /> {walkingTime}
              </span>
            </div>

            {filterMode === 'accessible' && closestAvailAcc && (
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                <DistanceBadge distance={closestAvailAcc.distanceToEntrance} />
                {dimCategory && <DimBadge category={dimCategory} />}
              </div>
            )}
          </div>
        )}
      </article>
    </Link>
  );
}

function DistanceBadge({ distance }: { distance: number }) {
  const { bg, label } = getDistanceColor(distance);
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white font-bold"
      style={{ background: bg, fontSize: '0.68rem' }}
      title="Distância à entrada"
    >
      <i className="fas fa-door-open" style={{ fontSize: '0.6rem' }} />
      {label} entrada
    </span>
  );
}

function DimBadge({ category }: { category: ReturnType<typeof getSpotDimCategory> }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold border ${category.bgClass} ${category.textClass}`}
      style={{ fontSize: '0.68rem', borderColor: 'currentColor', opacity: 0.9 }}
      title="Dimensão do lugar"
    >
      <i className={`fas ${category.icon}`} style={{ fontSize: '0.55rem' }} />
      {category.label}
    </span>
  );
}
