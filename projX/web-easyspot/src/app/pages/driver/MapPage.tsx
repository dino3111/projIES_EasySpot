import { useState, useEffect, useRef, useCallback } from 'react';
import type { ParkingLot } from '../../data/parkingTypes';
import { LeafletMap } from '../../components/parking/LeafletMap';
import { VehiclePicker } from '../../components/shared/VehiclePicker';
import { useProfile } from '../../context/ProfileContext';
import { ParkPanel } from './components/ParkPanel';
import { fetchParkDetails, fetchParksList } from '../../services/parksApi';
import { subscribeSpaceAvailableAlerts } from '../../services/parksApi';

type FilterType = 'all' | 'ev' | 'accessible' | 'both' | 'available';

const FILTERS: { id: FilterType; icon: string; label: string }[] = [
  { id: 'all',       icon: 'fa-layer-group',      label: 'Todos' },
  { id: 'available', icon: 'fa-circle-check',     label: 'Livres' },
  { id: 'both',      icon: 'fa-filter',            label: 'EV + Acessível' },
  { id: 'ev',        icon: 'fa-charging-station', label: 'EV' },
  { id: 'accessible', icon: 'fa-wheelchair',      label: 'Acessível' },
];

function getStatusInfo(lot: ParkingLot) {
  const total = Math.max(0, lot.totalSpots);
  const available = Math.min(total, Math.max(0, lot.availableSpots));
  const pct = available / Math.max(1, total);
  if (available === 0) return { label: 'Lotado',     hex: '#ef4444', iconCls: 'fa-circle-xmark',          labelColor: 'text-destructive' };
  if (pct < 0.2)               return { label: 'Quase cheio', hex: '#f59e0b', iconCls: 'fa-triangle-exclamation', labelColor: 'text-warning' };
  return                              { label: 'Disponível', hex: '#22c55e', iconCls: 'fa-circle-check',          labelColor: 'text-success' };
}

export function MapPage() {
  const { vehicles, driverTypes } = useProfile();
  const primaryVehicle = vehicles.find((v) => v.isPrimary) ?? vehicles[0] ?? null;
  const prefersEv = driverTypes.includes('ev');
  const prefersAccessible = driverTypes.includes('reduced_mobility');
  const initialFilter: FilterType =
    prefersEv && prefersAccessible
      ? 'both'
      : prefersEv
      ? 'ev'
      : prefersAccessible
        ? 'accessible'
        : 'all';

  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [selectedLotDetails, setSelectedLotDetails] = useState<ParkingLot | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>(initialFilter);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(primaryVehicle?.id ?? null);
  const [subscribeMessage, setSubscribeMessage] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const userSelectedVehicleRef = useRef(false);
  const userChangedFilterRef = useRef(false);

  useEffect(() => {
    const vehicle = vehicles.find((v) => v.id === selectedVehicleId) ?? null;
    if (userChangedFilterRef.current) return;
    if (!userSelectedVehicleRef.current) {
      if (prefersEv && prefersAccessible) {
        setActiveFilter('both');
        return;
      }
      if (prefersEv) {
        setActiveFilter('ev');
        return;
      }
      if (prefersAccessible) {
        setActiveFilter('accessible');
        return;
      }
    }
    if (vehicle?.isEV) setActiveFilter('ev');
    else if (vehicle?.isAccessible) setActiveFilter('accessible');
    else if (vehicle) setActiveFilter('all');
  }, [selectedVehicleId, vehicles, prefersEv, prefersAccessible]);

  const handleVehicleSelect = useCallback((id: string | null) => {
    userSelectedVehicleRef.current = true;
    userChangedFilterRef.current = false;
    setSelectedVehicleId(id);
  }, []);

  const handleFilterChange = useCallback((f: FilterType) => {
    userChangedFilterRef.current = true;
    setActiveFilter(f);
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const shouldUseVehicleCompatibility = activeFilter === 'ev' || activeFilter === 'accessible' || activeFilter === 'both';
        const data = await fetchParksList({
          page: 1,
          pageSize: 200,
          textQuery: searchQuery || undefined,
          vehicleId: shouldUseVehicleCompatibility ? selectedVehicleId : null,
          evOnly: activeFilter === 'ev' || activeFilter === 'both',
          accessibleOnly: activeFilter === 'accessible' || activeFilter === 'both',
          availableOnly: activeFilter === 'available',
        });
        if (mounted) setParkingLots(data.items);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [searchQuery, activeFilter, selectedVehicleId]);

  useEffect(() => {
    if (!selectedLotId) {
      setSelectedLotDetails(null);
      return;
    }
    let active = true;
    fetchParkDetails(selectedLotId)
      .then((details) => {
        if (!active) return;
        setSelectedLotDetails(details);
      })
      .catch(() => {
        if (!active) return;
        setSelectedLotDetails(null);
      });
    return () => {
      active = false;
    };
  }, [selectedLotId]);

  useEffect(() => {
    if (!selectedLotId) return;
    const hasSelectedLot = parkingLots.some((lot) => lot.id === selectedLotId);
    if (!hasSelectedLot) {
      setSelectedLotId(null);
      setSelectedLotDetails(null);
    }
  }, [parkingLots, selectedLotId]);

  const filteredLots = parkingLots;

  const selectedLot = selectedLotDetails ?? (parkingLots.find((l) => l.id === selectedLotId) ?? null);
  const handleSelectLot = useCallback((id: string) => setSelectedLotId(id), []);
  const handleSubscribeSelected = useCallback(async () => {
    if (!selectedLotId) return;
    try {
      setSubscribeMessage(null);
      await subscribeSpaceAvailableAlerts([selectedLotId]);
      setSubscribeMessage('Alerta ativado para este parque.');
    } catch {
      setSubscribeMessage('Não foi possível ativar alerta para este parque.');
    }
  }, [selectedLotId]);

  return (
    <div className="relative w-full flex overflow-hidden bg-background overscroll-none" style={{ height: 'calc(100vh - 56px)' }}>
      <div className="absolute inset-0 z-0 bg-muted">
        <LeafletMap lots={filteredLots} selectedId={selectedLotId} onSelect={handleSelectLot} height="100%" />
      </div>

      <ControlBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchRef={searchRef}
        vehicles={vehicles}
        selectedVehicleId={selectedVehicleId}
        onVehicleSelect={handleVehicleSelect}
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        filteredCount={loading ? 0 : filteredLots.length}
        onSubscribeSelected={selectedLot ? () => void handleSubscribeSelected() : undefined}
        subscribeMessage={subscribeMessage}
      />

      {selectedLot ? (
        <section
          className="md:hidden absolute bottom-0 left-0 right-0 z-20 pointer-events-auto"
          aria-label={`Detalhes de ${selectedLot.name}`}
          aria-live="polite"
        >
          <ParkPanel lot={selectedLot} onClose={() => setSelectedLotId(null)} getStatusInfo={getStatusInfo} />
        </section>
      ) : (
        <MapHint />
      )}

      <div
        className={`hidden md:flex flex-col absolute top-[68px] right-0 bottom-0 z-10 transition-all duration-300 pointer-events-auto ${
          selectedLot ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
        }`}
        style={{ width: '360px' }}
        aria-live="polite"
      >
        {selectedLot && (
          <div className="flex flex-col h-full bg-card/98 backdrop-blur-sm shadow-2xl border-l border-border overflow-hidden">
            <ParkPanel lot={selectedLot} onClose={() => setSelectedLotId(null)} getStatusInfo={getStatusInfo} desktop />
          </div>
        )}
      </div>
    </div>
  );
}

interface ControlBarProps {
  readonly searchQuery: string;
  readonly onSearchChange: (q: string) => void;
  readonly searchRef: React.RefObject<HTMLInputElement>;
  readonly vehicles: ReturnType<typeof useProfile>['vehicles'];
  readonly selectedVehicleId: string | null;
  readonly onVehicleSelect: (id: string | null) => void;
  readonly activeFilter: FilterType;
  readonly onFilterChange: (f: FilterType) => void;
  readonly filteredCount: number;
  readonly onSubscribeSelected?: () => void;
  readonly subscribeMessage: string | null;
}

function ControlBar({ searchQuery, onSearchChange, searchRef, vehicles, selectedVehicleId, onVehicleSelect, activeFilter, onFilterChange, filteredCount, onSubscribeSelected, subscribeMessage }: ControlBarProps) {
  return (
    <div className="absolute top-3 left-3 right-3 z-10 pointer-events-none">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <SearchBox searchQuery={searchQuery} onSearchChange={onSearchChange} searchRef={searchRef} />
          {vehicles.length > 0 && (
            <div className="bg-card/95 backdrop-blur-md rounded-2xl px-3 py-2 shadow-xl border border-border pointer-events-auto flex-shrink-0">
              <VehiclePicker vehicles={vehicles} selectedId={selectedVehicleId} onSelect={onVehicleSelect} label="" allLabel="Todos" />
            </div>
          )}
        </div>
        <FilterRow activeFilter={activeFilter} onFilterChange={onFilterChange} filteredCount={filteredCount} />
        {onSubscribeSelected && (
          <div className="pointer-events-auto">
            <button type="button" className="btn btn-xs btn-outline" onClick={onSubscribeSelected}>
              <i className="fas fa-bell" aria-hidden="true" /> Alertar-me deste parque
            </button>
            {subscribeMessage && <span className="ml-2 text-xs text-muted-foreground">{subscribeMessage}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

interface SearchBoxProps {
  readonly searchQuery: string;
  readonly onSearchChange: (q: string) => void;
  readonly searchRef: React.RefObject<HTMLInputElement>;
}

function SearchBox({ searchQuery, onSearchChange, searchRef }: SearchBoxProps) {
  return (
    <div className="flex items-center gap-2 bg-card/95 backdrop-blur-md rounded-2xl px-4 py-2.5 shadow-xl border border-border pointer-events-auto flex-1 min-w-0">
      <i className="fas fa-magnifying-glass text-primary flex-shrink-0 text-sm" aria-hidden="true" />
      <input
        ref={searchRef}
        type="text"
        placeholder="Pesquisar parque..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="flex-1 bg-transparent border-none outline-none text-foreground font-medium placeholder:text-muted-foreground text-sm min-w-0"
        aria-label="Pesquisar parque"
      />
      {searchQuery && (
        <button type="button" onClick={() => onSearchChange('')} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0" aria-label="Limpar pesquisa">
          <i className="fas fa-xmark" />
        </button>
      )}
    </div>
  );
}

interface FilterRowProps {
  readonly activeFilter: FilterType;
  readonly onFilterChange: (f: FilterType) => void;
  readonly filteredCount: number;
}

function FilterRow({ activeFilter, onFilterChange, filteredCount }: FilterRowProps) {
  return (
    <div className="flex gap-2 pointer-events-auto overflow-x-auto scrollbar-none overscroll-x-contain">
      {FILTERS.map((f) => (
        <button
          type="button"
          key={f.id}
          onClick={() => onFilterChange(f.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shadow-lg transition-all duration-200 backdrop-blur-md border flex-shrink-0 ${
            activeFilter === f.id
              ? 'bg-primary text-primary-foreground border-primary shadow-primary/20'
              : 'bg-card/95 text-muted-foreground border-border hover:bg-muted/90'
          }`}
          aria-pressed={activeFilter === f.id}
          aria-label={`Filtrar por ${f.label}`}
        >
          <i className={`fas ${f.icon}`} aria-hidden="true" />
          {f.label}
        </button>
      ))}
      <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-card/95 backdrop-blur-md shadow-lg border border-border text-xs text-muted-foreground font-bold whitespace-nowrap flex-shrink-0">
        <i className="fas fa-map-pin text-primary text-[10px]" aria-hidden="true" />
        {filteredCount}
      </div>
    </div>
  );
}

function MapHint() {
  return (
    <div className="md:hidden absolute bottom-20 left-1/2 -translate-x-1/2 z-10 pointer-events-none" aria-hidden="true">
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card/95 backdrop-blur-md shadow-lg text-xs text-muted-foreground font-bold whitespace-nowrap border border-border">
        <i className="fas fa-hand-pointer text-primary" />
        Selecione no mapa
      </div>
    </div>
  );
}
