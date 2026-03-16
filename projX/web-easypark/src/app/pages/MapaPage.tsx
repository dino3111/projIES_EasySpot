import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router';
import { mockParkingLots, simulateRealTimeUpdate, type ParkingLot } from '../data/parkingData';
import { LeafletMap } from '../components/LeafletMap';
import { VehiclePicker } from '../components/VehiclePicker';
import { useProfile } from '../context/ProfileContext';

type FilterType = 'todos' | 'ev' | 'acessivel' | 'disponivel';

export function MapaPage() {
  const { vehicles } = useProfile();
  const primaryVehicle = vehicles.find((v) => v.isPrimary) ?? vehicles[0] ?? null;

  const [parkingLots, setParkingLots] = useState<ParkingLot[]>(mockParkingLots);
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('todos');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(primaryVehicle?.id ?? null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const vehicle = vehicles.find((v) => v.id === selectedVehicleId) ?? null;
    if (vehicle?.isEV) setActiveFilter('ev');
    else if (vehicle?.isAccessible) setActiveFilter('acessivel');
    else if (vehicle) setActiveFilter('todos');
  }, [selectedVehicleId, vehicles]);

  useEffect(() => {
    const interval = setInterval(() => {
      setParkingLots((current) =>
        current.map((lot) => (Math.random() > 0.7 ? simulateRealTimeUpdate(lot) : lot))
      );
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) ?? null,
    [vehicles, selectedVehicleId],
  );

  const filteredLots = useMemo(() => {
    return parkingLots.filter((lot) => {
      if (activeFilter === 'ev') {
        if (!lot.hasEVCharger || !lot.evChargers?.length) return false;
        if (selectedVehicle?.isEV && selectedVehicle.chargerTypes?.length) {
          const hasCompatible = lot.evChargers.some((c) => selectedVehicle.chargerTypes!.includes(c.type));
          if (!hasCompatible) return false;
        }
      }
      if (activeFilter === 'acessivel' && (!lot.hasAccessible || !lot.accessibleSpots?.length)) return false;
      if (activeFilter === 'disponivel' && lot.availableSpots === 0) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!lot.name.toLowerCase().includes(q) && !lot.address.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [parkingLots, activeFilter, searchQuery, selectedVehicle]);

  const selectedLot = parkingLots.find((l) => l.id === selectedLotId) ?? null;

  const handleSelectLot = useCallback((id: string) => {
    setSelectedLotId(id);
  }, []);

  const getStatusInfo = (lot: ParkingLot) => {
    const pct = lot.availableSpots / lot.totalSpots;
    if (lot.availableSpots === 0) return { label: 'Lotado',      hex: '#ef4444', iconCls: 'fa-circle-xmark', labelColor: 'text-destructive' };
    if (pct < 0.2)               return { label: 'Quase cheio',  hex: '#f59e0b', iconCls: 'fa-triangle-exclamation', labelColor: 'text-warning' };
    return                              { label: 'Disponível',   hex: '#22c55e', iconCls: 'fa-circle-check', labelColor: 'text-success' };
  };

  const FILTERS: { id: FilterType; icon: string; label: string }[] = [
    { id: 'todos',      icon: 'fa-layer-group',     label: 'Todos' },
    { id: 'disponivel', icon: 'fa-circle-check',    label: 'Livres' },
    { id: 'ev',         icon: 'fa-charging-station', label: 'EV' },
    { id: 'acessivel',  icon: 'fa-wheelchair',       label: 'Acessível' },
  ];

  return (
    <div className="relative w-full flex overflow-hidden bg-background overscroll-none" style={{ height: 'calc(100vh - 56px)' }}>

      {/* ── Mapa ──────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-0 bg-muted">
        <LeafletMap
          lots={filteredLots}
          selectedId={selectedLotId}
          onSelect={handleSelectLot}
          height="100%"
        />
      </div>

      {/* ── Barra de controlo flutuante ──────────────────────────────── */}
      <div className="absolute top-3 left-3 right-3 z-10 pointer-events-none">
        <div className="flex flex-col gap-2">

          {/* Linha 1: pesquisa + seletor de veículo */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-card/95 backdrop-blur-md rounded-2xl px-4 py-2.5 shadow-xl border border-border pointer-events-auto flex-1 min-w-0">
              <i className="fas fa-magnifying-glass text-primary flex-shrink-0 text-sm" aria-hidden="true" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Pesquisar parque..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-foreground font-medium placeholder:text-muted-foreground text-sm min-w-0"
                aria-label="Pesquisar parque"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                  aria-label="Limpar pesquisa"
                >
                  <i className="fas fa-xmark" />
                </button>
              )}
            </div>
            {vehicles.length > 0 && (
              <div className="bg-card/95 backdrop-blur-md rounded-2xl px-3 py-2 shadow-xl border border-border pointer-events-auto flex-shrink-0">
                <VehiclePicker
                  vehicles={vehicles}
                  selectedId={selectedVehicleId}
                  onSelect={setSelectedVehicleId}
                  label=""
                  allLabel="Todos"
                />
              </div>
            )}
          </div>

          {/* Linha 2: filtros */}
          <div className="flex gap-2 pointer-events-auto overflow-x-auto scrollbar-none overscroll-x-contain">
            {FILTERS.map((f) => (
              <button
                type="button"
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shadow-lg transition-all duration-200 backdrop-blur-md border flex-shrink-0 ${
                  activeFilter === f.id
                    ? 'bg-primary text-primary-foreground border-primary shadow-primary/20'
                    : 'bg-card/95 text-muted-foreground border-border hover:bg-muted/90'
                }`}
                aria-pressed={activeFilter === f.id ? 'true' : 'false'}
                aria-label={`Filtrar por ${f.label}`}
              >
                <i className={`fas ${f.icon}`} aria-hidden="true" />
                {f.label}
              </button>
            ))}

            {/* Contador */}
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-card/95 backdrop-blur-md shadow-lg border border-border text-xs text-muted-foreground font-bold whitespace-nowrap flex-shrink-0">
              <i className="fas fa-map-pin text-primary text-[10px]" aria-hidden="true" />
              {filteredLots.length}
            </div>
          </div>

        </div>
      </div>

      {/* ── Painel mobile (bottom sheet) ──────────────────────── */}
      {selectedLot ? (
        <section
          className="md:hidden absolute bottom-0 left-0 right-0 z-20 pointer-events-auto"
          aria-label={`Detalhes de ${selectedLot.name}`}
          aria-live="polite"
        >
          <ParkPanel
            lot={selectedLot}
            onClose={() => setSelectedLotId(null)}
            getStatusInfo={getStatusInfo}
          />
        </section>
      ) : (
        <div
          className="md:hidden absolute bottom-20 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
          aria-hidden="true"
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card/95 backdrop-blur-md shadow-lg text-xs text-muted-foreground font-bold whitespace-nowrap border border-border">
            <i className="fas fa-hand-pointer text-primary" />
            Selecione no mapa
          </div>
        </div>
      )}

      {/* ── Painel desktop (sidebar direita) ──────────────────────────── */}
      <div
        className={`hidden md:flex flex-col absolute top-[68px] right-0 bottom-0 z-10 transition-all duration-300 pointer-events-auto ${
          selectedLot ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
        }`}
        style={{ width: '360px' }}
        aria-live="polite"
      >
        {selectedLot && (
          <div className="flex flex-col h-full bg-card/98 backdrop-blur-sm shadow-2xl border-l border-border overflow-hidden">
            <ParkPanel
              lot={selectedLot}
              onClose={() => setSelectedLotId(null)}
              getStatusInfo={getStatusInfo}
              desktop
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAINEL DE PARQUE (mobile bottom sheet + desktop sidebar)
   ═══════════════════════════════════════════════════════════ */
interface ParkPanelProps {
  readonly lot: ParkingLot;
  readonly onClose: () => void;
  readonly getStatusInfo: (lot: ParkingLot) => { label: string; hex: string; iconCls: string; labelColor: string };
  readonly desktop?: boolean;
}

function ParkPanel({ lot, onClose, getStatusInfo, desktop = false }: ParkPanelProps) {
  const status       = getStatusInfo(lot);
  const occupied     = lot.totalSpots - lot.availableSpots;
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

      {/* Handle mobile */}
      {!desktop && (
        <div className="flex justify-center pt-3 pb-2 sticky top-0 bg-card z-10" aria-hidden="true" onClick={onClose}>
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30 active:bg-muted-foreground/50 transition-colors cursor-pointer" />
        </div>
      )}

      {/* Cabeçalho roxo */}
      <div
        className="px-5 py-4 text-white flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #7357ec 0%, #4a3696 100%)' }}
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span
                className="text-white text-[10px] px-2 py-0.5 rounded font-bold flex items-center gap-1 uppercase"
                style={{ background: status.hex }}
              >
                <i className={`fas ${status.iconCls} text-[9px]`} aria-hidden="true" />
                {status.label}
              </span>
              {lot.is24h && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-white/20 font-bold text-white uppercase">24h</span>
              )}
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

        {/* Stats no cabeçalho */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/10 rounded-xl p-2 text-center backdrop-blur-sm border border-white/5">
            <p className="text-white font-black text-2xl leading-none">{lot.availableSpots}</p>
            <p className="text-white/60 text-[9px] mt-1 font-bold uppercase">livres</p>
          </div>
          <div className="bg-white/10 rounded-xl p-2 text-center backdrop-blur-sm border border-white/5">
            <p className="text-white font-black text-xl leading-none mt-1">€{lot.hourlyRate.toFixed(2)}</p>
            <p className="text-white/60 text-[9px] mt-1 font-bold uppercase">hora</p>
          </div>
          <div className="bg-white/10 rounded-xl p-2 text-center backdrop-blur-sm border border-white/5">
            <p className="text-white font-black text-xl leading-none mt-1">€{lot.dailyMax.toFixed(2)}</p>
            <p className="text-white/60 text-[9px] mt-1 font-bold uppercase">máx diário</p>
          </div>
        </div>
      </div>

      {/* Conteúdo scrollable */}
      <div className={`px-4 py-4 flex-1 space-y-4 ${desktop ? '' : 'pb-8'}`}>

        {/* Barra de ocupação */}
        <div className="bg-muted/30 p-3 rounded-xl border border-border">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-bold text-foreground">Ocupação do Parque</span>
            <span className="text-xs font-black" style={{ color: status.hex }}>{occupancyPct}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${occupancyPct}%`, background: status.hex }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5 font-medium">
            <span>{lot.availableSpots} lugares livres</span>
            <span>{occupied} ocupados</span>
          </div>
        </div>

        {/* Informações 2×2 */}
        <div className="grid grid-cols-2 gap-2">
          <SidebarInfoTile icon="fa-person-walking" label="A pé"       value={lot.walkingTime} />
          <SidebarInfoTile icon="fa-route"          label="Distância"   value={lot.distance} />
          <SidebarInfoTile icon="fa-clock"          label="Horário"     value={lot.is24h ? '24h' : lot.openingHours} />
          <SidebarInfoTile icon="fa-phone"          label="Contacto"    value={lot.phone} />
        </div>

        {/* Avaliação */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-warning/5 border border-warning/20">
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <i key={i} className={`fas fa-star text-[10px] ${i < Math.round(lot.rating) ? 'text-warning' : 'text-muted'}`} aria-hidden="true" />
            ))}
          </div>
          <span className="font-bold text-foreground text-xs">{lot.rating}</span>
          <span className="text-muted-foreground text-[10px] font-medium">({lot.reviewCount} avaliações)</span>
        </div>

        {/* EV + Acessibilidade */}
        {(totalEV > 0 || totalAcc > 0) && (
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
        )}

        {/* Comodidades */}
        {lot.amenities.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Comodidades</p>
            <div className="flex flex-wrap gap-1.5">
              {lot.amenities.map((a) => (
                <span
                  key={a}
                  className="flex items-center gap-1 px-2 py-1.5 rounded bg-muted border border-border text-foreground text-[10px] font-bold"
                >
                  <i className={`fas ${amenityIcon(a)} text-[9px] opacity-70`} aria-hidden="true" />
                  {amenityLabel(a)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Ações */}
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
            to={`/parque/${lot.id}`}
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

/* ── Tile de info ───────────────────────────────────────────────────────── */
function SidebarInfoTile({ icon, label, value }: Readonly<{ icon: string; label: string; value: string }>) {
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

/* ── Helpers ────────────────────────────────────────────────────────────── */
function amenityIcon(a: string) { return { security: 'fa-shield-halved', covered: 'fa-warehouse', elevator: 'fa-elevator', toilets: 'fa-restroom', 'ev-charging': 'fa-charging-station', accessible: 'fa-wheelchair', 'bike-rack': 'fa-bicycle', cctv: 'fa-video' }[a] || 'fa-check'; }
function amenityLabel(a: string) { return { security: 'Seg.', covered: 'Cob.', elevator: 'Elev.', toilets: 'WC', 'ev-charging': 'EV', accessible: 'Acess.', 'bike-rack': 'Bici.', cctv: 'CCTV' }[a] || a; }
