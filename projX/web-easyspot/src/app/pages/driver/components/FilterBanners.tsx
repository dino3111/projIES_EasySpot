import { getDistanceColor } from '../../../data/parkingTypes';
import type { FilterMode } from '../../../components/parking/ParkingCard';

interface FilterBannersProps {
  filterMode: FilterMode;
  totalAccessible: number;
  totalEV: number;
  closestAccDistance: number | null;
  filteredCount: number;
}

export function FilterBanners({ filterMode, totalAccessible, totalEV, closestAccDistance, filteredCount }: FilterBannersProps) {
  if (filterMode === 'both') return <BothBanner totalAccessible={totalAccessible} totalEV={totalEV} closestAccDistance={closestAccDistance} />;
  if (filterMode === 'accessible') return <AccessibleBanner totalAccessible={totalAccessible} closestAccDistance={closestAccDistance} filteredCount={filteredCount} />;
  if (filterMode === 'ev') return <EVBanner totalEV={totalEV} filteredCount={filteredCount} />;
  return null;
}

function BothBanner({ totalAccessible, totalEV, closestAccDistance }: { totalAccessible: number; totalEV: number; closestAccDistance: number | null }) {
  return (
    <div
      className="rounded-xl px-4 py-3.5 mb-4 border"
      style={{ background: 'linear-gradient(135deg, rgba(115,87,236,0.08) 0%, rgba(34,197,94,0.08) 100%)', borderColor: 'rgba(115,87,236,0.3)' }}
      role="status" aria-live="polite"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-1">
          <i className="fas fa-wheelchair text-primary" style={{ fontSize: '0.9rem' }} />
          <span className="text-primary font-bold" style={{ fontSize: '0.75rem' }}>+</span>
          <i className="fas fa-charging-station" style={{ color: '#22c55e', fontSize: '0.9rem' }} />
        </div>
        <p className="text-foreground font-bold" style={{ fontSize: '0.85rem' }}>Acessível &amp; Carregamento EV</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <StatTile icon="fa-wheelchair" label="LUGARES ACESSÍVEIS" value={totalAccessible} color="text-primary" bg="bg-primary/8" border="border-primary/20" valueColor="text-primary" />
        <StatTile icon="fa-charging-station" label="CARREGADORES EV" value={totalEV} color="" bg="" border="" valueColor="" greenStyle />
      </div>
      {closestAccDistance !== null && (
        <p className="text-muted-foreground mt-2" style={{ fontSize: '0.72rem' }}>
          <i className="fas fa-door-open mr-1 text-primary" />
          Lugar acessível mais próximo de uma entrada:{' '}
          <span className="font-bold text-foreground">{closestAccDistance}m</span>
        </p>
      )}
    </div>
  );
}

function StatTile({ icon, label, value, color, bg, border, valueColor, greenStyle }: {
  icon: string; label: string; value: number; color: string; bg: string; border: string; valueColor: string; greenStyle?: boolean;
}) {
  if (greenStyle) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg px-3 py-2 border" style={{ background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.25)' }}>
        <i className={`fas ${icon}`} style={{ color: '#22c55e', fontSize: '1rem' }} />
        <div>
          <p className="text-muted-foreground" style={{ fontSize: '0.65rem', fontWeight: 600 }}>{label}</p>
          <p className="font-extrabold" style={{ fontSize: '1.1rem', lineHeight: 1, color: '#22c55e' }}>
            {value}<span className="text-muted-foreground font-medium" style={{ fontSize: '0.7rem' }}> livres</span>
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className={`flex items-center gap-2.5 rounded-lg px-3 py-2 ${bg} border ${border}`}>
      <i className={`fas ${icon} ${color}`} style={{ fontSize: '1rem' }} />
      <div>
        <p className="text-muted-foreground" style={{ fontSize: '0.65rem', fontWeight: 600 }}>{label}</p>
        <p className={`${valueColor} font-extrabold`} style={{ fontSize: '1.1rem', lineHeight: 1 }}>
          {value}<span className="text-muted-foreground font-medium" style={{ fontSize: '0.7rem' }}> livres</span>
        </p>
      </div>
    </div>
  );
}

function AccessibleBanner({ totalAccessible, closestAccDistance, filteredCount }: { totalAccessible: number; closestAccDistance: number | null; filteredCount: number }) {
  return (
    <div className="rounded-xl px-4 py-3 mb-4 bg-primary/10 border border-primary/30" role="status" aria-live="polite">
      <div className="flex items-start gap-3 mb-2">
        <i className="fas fa-wheelchair-move mt-0.5 flex-shrink-0 text-primary" aria-hidden="true" />
        <div className="flex-1">
          <p className="text-foreground" style={{ fontSize: '0.8rem', fontWeight: 700 }}>Lugares Acessíveis Disponíveis</p>
          <p className="text-foreground/70" style={{ fontSize: '0.75rem' }}>
            {totalAccessible > 0
              ? `${totalAccessible} lugar${totalAccessible !== 1 ? 'es' : ''} livre${totalAccessible !== 1 ? 's' : ''} nos ${filteredCount} parque${filteredCount !== 1 ? 's' : ''} filtrados.${closestAccDistance !== null ? ` Mais próximo: ${closestAccDistance}m da entrada.` : ''}`
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
  );
}

function EVBanner({ totalEV, filteredCount }: { totalEV: number; filteredCount: number }) {
  return (
    <div className="rounded-xl px-4 py-3 mb-4 border" style={{ background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.3)' }} role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <i className="fas fa-charging-station flex-shrink-0" style={{ color: '#22c55e' }} />
        <div>
          <p className="text-foreground" style={{ fontSize: '0.8rem', fontWeight: 700 }}>Carregadores EV Disponíveis</p>
          <p className="text-foreground/60" style={{ fontSize: '0.75rem' }}>
            {totalEV > 0
              ? `${totalEV} carregador${totalEV !== 1 ? 'es' : ''} livre${totalEV !== 1 ? 's' : ''} nos ${filteredCount} parque${filteredCount !== 1 ? 's' : ''} filtrados.`
              : 'Sem carregadores EV disponíveis de momento.'}
          </p>
        </div>
      </div>
    </div>
  );
}
