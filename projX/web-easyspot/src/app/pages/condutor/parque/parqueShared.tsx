import type { ParkingSpot, SpotStatus } from '../../../data/parkingData';

export function InfoBox({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div className="bg-card rounded-xl p-3 border border-border flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 ${color}`}>
        <i className={`fas ${icon} text-sm`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase font-bold text-muted-foreground mb-0.5">{label}</p>
        <p className="text-sm font-bold text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

export function MapLegend({ hex, label }: { hex: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="w-2 h-2 rounded-sm" style={{ background: hex }} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function SpotCell({ spot }: { spot: ParkingSpot }) {
  const palette: Record<SpotStatus, string> = {
    free: '#22c55e', occupied: '#ef4444', reserved: '#f59e0b', ev: '#7357ec', accessible: '#0ea5e9',
  };
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg shadow-sm"
      style={{ width: 35, height: 45, background: palette[spot.status] }}
    >
      <i className={`fas ${spot.status === 'free' ? 'fa-square-parking' : spot.status === 'ev' ? 'fa-charging-station' : spot.status === 'accessible' ? 'fa-wheelchair' : 'fa-car'} text-white/90 text-xs`} />
      {spot.label && <span className="text-white font-bold mt-0.5 text-[10px]">{spot.label}</span>}
    </div>
  );
}

export function ZoneTypeBadge({ type }: { type: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    ev: { label: 'EV', cls: 'bg-primary/20 text-primary' },
    accessible: { label: 'Acessível', cls: 'bg-info/20 text-info' },
    standard: { label: 'Geral', cls: 'bg-muted text-muted-foreground' },
  };
  const c = cfg[type] || cfg.standard;
  return <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.cls}`}>{c.label}</span>;
}

export function amenityIcon(a: string) {
  return ({ security: 'fa-shield-halved', covered: 'fa-warehouse', elevator: 'fa-elevator', toilets: 'fa-restroom', 'ev-charging': 'fa-charging-station', accessible: 'fa-wheelchair', 'bike-rack': 'fa-bicycle', cctv: 'fa-video' } as Record<string, string>)[a] || 'fa-check';
}

export function amenityLabel(a: string) {
  return ({ security: 'Seg.', covered: 'Cob.', elevator: 'Elev.', toilets: 'WC', 'ev-charging': 'EV', accessible: 'Acess.', 'bike-rack': 'Bici.', cctv: 'CCTV' } as Record<string, string>)[a] || a;
}
