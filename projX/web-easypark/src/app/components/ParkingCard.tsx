import { Link } from 'react-router';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { ParkingLot } from '../data/parkingData';

interface ParkingCardProps {
  lot: ParkingLot;
  highlightAccessible?: boolean;
}

export function ParkingCard({ lot, highlightAccessible = false }: ParkingCardProps) {
  const {
    id, name, address, availableSpots, totalSpots,
    hourlyRate, walkingTime, hasEVCharger, hasAccessible
  } = lot;

  const occupancyPct = Math.round(((totalSpots - availableSpots) / totalSpots) * 100);
  const isFull = availableSpots === 0;
  const isAlmostFull = availableSpots > 0 && availableSpots <= Math.ceil(totalSpots * 0.2);

  const statusColor = isFull
    ? { bg: 'bg-error', text: 'text-white', label: 'Lotado' }
    : isAlmostFull
    ? { bg: 'bg-warning', text: 'text-black', label: 'Quase Cheio' }
    : { bg: 'bg-success', text: 'text-white', label: 'Disponível' };

  const progressColor = isFull ? '#ef4444' : isAlmostFull ? '#f59e0b' : '#22c55e';

  return (
    <Link
      to={`/parque/${id}`}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl relative no-underline"
      aria-label={`Ver detalhes do ${name}. ${availableSpots} lugares disponíveis de ${totalSpots}.`}
    >
      <article
        className={`rounded-xl p-3.5 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col h-full relative bg-card border ${
          highlightAccessible ? 'border-primary ring-1 ring-primary/50' : 'border-border'
        } hover:shadow-lg dark:hover:shadow-primary/5`}
      >
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex gap-1.5 mb-1.5 items-center">
              <span 
                className={`px-1.5 py-0.5 rounded text-[0.65rem] font-bold uppercase inline-block ${statusColor.bg} ${statusColor.text}`}
              >
                {statusColor.label}
              </span>
              <div className="flex gap-1.5 text-xs">
                {hasAccessible && lot.accessibleSpots && lot.accessibleSpots.length > 0 && (
                  <i className="fas fa-wheelchair" style={{ color: highlightAccessible ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }} aria-hidden="true" title="Lugares Acessíveis"></i>
                )}
                {hasEVCharger && lot.evChargers && lot.evChargers.length > 0 && (
                  <i className="fas fa-charging-station text-muted-foreground" aria-hidden="true" title="Carregamento EV"></i>
                )}
              </div>
            </div>
            <h2 className="text-foreground font-bold text-base leading-tight line-clamp-1">
              {name}
            </h2>
            <p className="flex items-center gap-1 text-muted-foreground text-xs mt-1 line-clamp-1">
              <i className="fas fa-location-dot" aria-hidden="true"></i>
              {address}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="block font-bold text-foreground text-base">€{hourlyRate.toFixed(2)}</span>
            <span className="text-[0.65rem] text-muted-foreground uppercase">/hora</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Livres', value: availableSpots, color: progressColor },
                      { name: 'Ocupados', value: totalSpots - availableSpots, color: 'rgba(169, 155, 232, 0.1)' }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={15}
                    outerRadius={21}
                    dataKey="value"
                    stroke="none"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {[
                      { name: 'Livres', value: availableSpots, color: progressColor },
                      { name: 'Ocupados', value: totalSpots - availableSpots, color: 'rgba(169, 155, 232, 0.1)' }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-foreground" style={{ fontSize: '0.65rem', fontWeight: 800 }}>
                  {100 - occupancyPct}%
                </span>
              </div>
            </div>
            
            <div className="flex flex-col">
              <span className="text-muted-foreground font-semibold uppercase text-[0.65rem]">
                Livres
              </span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: progressColor, lineHeight: 1 }}>
                {availableSpots}
                <span className="text-muted-foreground font-medium text-xs ml-0.5">/{totalSpots}</span>
              </span>
            </div>
          </div>
          <div className="text-right">
             <span className="flex items-center gap-1 text-muted-foreground text-xs font-medium">
                <i className="fas fa-person-walking" aria-hidden="true" /> {walkingTime}
             </span>
          </div>
        </div>
      </article>
    </Link>
  );
}