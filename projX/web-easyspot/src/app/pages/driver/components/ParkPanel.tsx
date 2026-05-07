import { Link } from 'react-router';
import type { ParkingLot } from '../../../data/parkingTypes';

export interface StatusInfo {
  label: string;
  hex: string;
  iconCls: string;
  labelColor: string;
}

interface ParkPanelProps {
  readonly lot: ParkingLot;
  readonly onClose: () => void;
  readonly getStatusInfo: (lot: ParkingLot) => StatusInfo;
  readonly desktop?: boolean;
}

export function ParkPanel({ lot, onClose, getStatusInfo, desktop = false }: ParkPanelProps) {
  const status = getStatusInfo(lot);
  const occupied = lot.totalSpots - lot.availableSpots;
  const occupancyPct = lot.totalSpots > 0 ? Math.round((occupied / lot.totalSpots) * 100) : 0;
  const availableEV  = lot.evChargers?.filter((c) => c.available).length ?? 0;
  const totalEV      = lot.evChargers?.length ?? 0;
  const availableAcc = lot.accessibleSpots?.filter((s) => s.available).length ?? 0;
  const totalAcc     = lot.accessibleSpots?.length ?? 0;

  return (
    <div
      className={
        desktop
          ? 'flex flex-col h-full overflow-y-auto overscroll-y-contain'
          : 'rounded-t-3xl bg-card shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.3)] border-t border-border flex flex-col max-h-[85vh] overflow-y-auto overscroll-y-contain touch-pan-y'
      }
    >
      {!desktop && (
        <div className="flex justify-center pt-3 pb-2 sticky top-0 bg-card z-10" aria-hidden="true" onClick={onClose}>
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30 active:bg-muted-foreground/50 transition-colors cursor-pointer" />
        </div>
      )}

      <div className="px-5 py-4 text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #7357ec 0%, #4a3696 100%)' }}>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span className="text-white text-[10px] px-2 py-0.5 rounded font-bold flex items-center gap-1 uppercase" style={{ background: status.hex }}>
                <i className={`fas ${status.iconCls} text-[9px]`} aria-hidden="true" />
                {status.label}
              </span>
              {lot.is24h && <span className="text-[10px] px-2 py-0.5 rounded bg-white/20 font-bold text-white uppercase">24h</span>}
            </div>
            <h2 className="text-white font-bold text-xl leading-tight truncate">{lot.name}</h2>
            <p className="text-white/70 text-xs mt-0.5 flex items-center gap-1">
              <i className="fas fa-location-dot flex-shrink-0" aria-hidden="true" />
              <span className="truncate">{lot.address}</span>
            </p>
          </div>
          {desktop && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex-shrink-0 flex items-center justify-center cursor-pointer"
              aria-label="Fechar detalhes"
            >
              <i className="fas fa-xmark text-white text-sm" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <HeaderStat label="livres"      value={String(lot.availableSpots)} large />
          <HeaderStat label="hora"        value={`€${lot.hourlyRate.toFixed(2)}`} />
          <HeaderStat label="máx diário"  value={`€${lot.dailyMax.toFixed(2)}`} />
        </div>
      </div>

      <div className={`px-4 py-4 flex-1 space-y-4 ${desktop ? '' : 'pb-8'}`}>
        <OccupancyBar occupied={occupied} availableSpots={lot.availableSpots} totalSpots={lot.totalSpots} occupancyPct={occupancyPct} statusHex={status.hex} />

        <div className="grid grid-cols-2 gap-2">
          <InfoTile icon="fa-person-walking" label="A pé"     value={lot.walkingTime} />
          <InfoTile icon="fa-route"          label="Distância" value={lot.distance} />
          <InfoTile icon="fa-clock"          label="Horário"   value={lot.is24h ? '24h' : lot.openingHours} />
          <InfoTile icon="fa-phone"          label="Contacto"  value={lot.phone} />
        </div>

        <RatingRow rating={lot.rating} reviewCount={lot.reviewCount} />

        {(totalEV > 0 || totalAcc > 0) && (
          <EVAccessRow availableEV={availableEV} totalEV={totalEV} availableAcc={availableAcc} totalAcc={totalAcc} />
        )}

        {lot.amenities.length > 0 && <AmenitiesRow amenities={lot.amenities} />}

        <div className="flex gap-2 pt-2">
          <a
            href={`https://www.openstreetmap.org/directions?from=&to=${lot.latitude},${lot.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-sm font-bold flex-none gap-1 border-border text-muted-foreground hover:bg-muted"
            aria-label="Obter percurso"
          >
            <i className="fas fa-location-arrow text-[10px]" aria-hidden="true" />
            Percurso
          </a>
          <Link
            to={`/parking/${lot.id}`}
            className="btn btn-primary btn-sm font-bold flex-1 gap-1"
            aria-label={`Mais informações sobre ${lot.name}`}
          >
            <i className="fas fa-circle-info text-[10px]" aria-hidden="true" />
            Mais Detalhes
          </Link>
        </div>
      </div>
    </div>
  );
}

function HeaderStat({ label, value, large }: { label: string; value: string; large?: boolean }) {
  return (
    <div className="bg-white/10 rounded-xl p-2 text-center backdrop-blur-sm border border-white/5">
      <p className={`text-white font-black leading-none ${large ? 'text-2xl' : 'text-xl mt-1'}`}>{value}</p>
      <p className="text-white/60 text-[9px] mt-1 font-bold uppercase">{label}</p>
    </div>
  );
}

function OccupancyBar({ occupied, availableSpots, totalSpots, occupancyPct, statusHex }: {
  occupied: number; availableSpots: number; totalSpots: number; occupancyPct: number; statusHex: string;
}) {
  return (
    <div className="bg-muted/30 p-3 rounded-xl border border-border">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-bold text-foreground">Ocupação do Parque</span>
        <span className="text-xs font-black" style={{ color: statusHex }}>{occupancyPct}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${occupancyPct}%`, background: statusHex }} />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5 font-medium">
        <span>{availableSpots} lugares livres</span>
        <span>{occupied} ocupados</span>
      </div>
    </div>
  );
}

function InfoTile({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-xl bg-card border border-border shadow-sm">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        <i className={`fas ${icon} text-primary text-xs`} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">{label}</p>
        <p className="font-black text-foreground text-xs truncate">{value}</p>
      </div>
    </div>
  );
}

function RatingRow({ rating, reviewCount }: { readonly rating: number; readonly reviewCount: number }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-warning/5 border border-warning/20">
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <i key={`star-${i}`} className={`fas fa-star text-[10px] ${i < Math.round(rating) ? 'text-warning' : 'text-muted'}`} aria-hidden="true" />
        ))}
      </div>
      <span className="font-bold text-foreground text-xs">{rating}</span>
      <span className="text-muted-foreground text-[10px] font-medium">({reviewCount} avaliações)</span>
    </div>
  );
}

function EVAccessRow({ availableEV, totalEV, availableAcc, totalAcc }: {
  availableEV: number; totalEV: number; availableAcc: number; totalAcc: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {totalEV > 0 && (
        <div className="rounded-xl p-3 bg-card border border-border shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <i className="fas fa-charging-station text-primary text-xs" aria-hidden="true" />
            <span className="text-foreground font-bold text-[10px] uppercase">Carregamento</span>
          </div>
          <p className="text-foreground font-black text-lg leading-none">
            {availableEV}<span className="text-muted-foreground font-normal text-xs ml-0.5">/ {totalEV}</span>
          </p>
        </div>
      )}
      {totalAcc > 0 && (
        <div className="rounded-xl p-3 bg-card border border-border shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <i className="fas fa-wheelchair text-info text-xs" aria-hidden="true" />
            <span className="text-foreground font-bold text-[10px] uppercase">Acessíveis</span>
          </div>
          <p className="text-foreground font-black text-lg leading-none">
            {availableAcc}<span className="text-muted-foreground font-normal text-xs ml-0.5">/ {totalAcc}</span>
          </p>
        </div>
      )}
    </div>
  );
}

function AmenitiesRow({ amenities }: { readonly amenities: readonly string[] }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Comodidades</p>
      <div className="flex flex-wrap gap-1.5">
        {amenities.map((a) => (
          <span key={a} className="flex items-center gap-1 px-2 py-1.5 rounded bg-muted border border-border text-foreground text-[10px] font-bold">
            <i className={`fas ${amenityIcon(a)} text-[9px] opacity-70`} aria-hidden="true" />
            {amenityLabel(a)}
          </span>
        ))}
      </div>
    </div>
  );
}

function amenityIcon(a: string) {
  return ({ security: 'fa-shield-halved', covered: 'fa-warehouse', elevator: 'fa-elevator', toilets: 'fa-restroom', 'ev-charging': 'fa-charging-station', accessible: 'fa-wheelchair', 'bike-rack': 'fa-bicycle', cctv: 'fa-video' } as Record<string, string>)[a] || 'fa-check';
}

function amenityLabel(a: string) {
  return ({ security: 'Seg.', covered: 'Cob.', elevator: 'Elev.', toilets: 'WC', 'ev-charging': 'EV', accessible: 'Acess.', 'bike-rack': 'Bici.', cctv: 'CCTV' } as Record<string, string>)[a] || a;
}
