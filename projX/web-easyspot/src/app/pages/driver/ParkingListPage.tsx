import { useState, useEffect, useMemo } from 'react';
import { FilterBar } from '../../components/parking/FilterBar';
import { ParkingCard, type FilterMode } from '../../components/parking/ParkingCard';
import { VehiclePicker } from '../../components/shared/VehiclePicker';
import { mockParkingLots, simulateRealTimeUpdate, type ParkingLot } from '../../data/parkingData';
import { useProfile } from '../../context/ProfileContext';
import { CompactParkRow } from './components/CompactParkRow';
import { FilterBanners } from './components/FilterBanners';

export function ParkingListPage() {
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

  useEffect(() => {
    const interval = setInterval(() => {
      setParkingLots((current) =>
        current.map((lot) => (Math.random() > 0.5 ? simulateRealTimeUpdate(lot) : lot))
      );
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const filterMode: FilterMode =
    showAccessibleOnly && showEVOnly ? 'both'
    : showAccessibleOnly ? 'accessible'
    : showEVOnly ? 'ev'
    : null;

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
        if (!lot.hasEVCharger || !lot.evChargers?.length) return false;
        if (selectedVehicle?.isEV && selectedVehicle.chargerTypes?.length) {
          const hasCompatible = lot.evChargers.some((c) => selectedVehicle.chargerTypes!.includes(c.type));
          if (!hasCompatible) return false;
        }
      }
      if (showAccessibleOnly && (!lot.hasAccessible || !lot.accessibleSpots?.length)) return false;
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
      <PageHeader mobileView={mobileView} setMobileView={setMobileView} />

      {vehicles.length > 0 && (
        <div className="mb-3">
          <VehiclePicker vehicles={vehicles} selectedId={selectedVehicleId} onSelect={setSelectedVehicleId} />
        </div>
      )}

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

      <FilterBanners
        filterMode={filterMode}
        totalAccessible={totalAccessible}
        totalEV={totalEV}
        closestAccDistance={closestAccDistance}
        filteredCount={filtered.length}
      />

      {filtered.length > 0 ? (
        <ParkingResults
          filtered={filtered}
          filterMode={filterMode}
          mobileView={mobileView}
          showAccessibleOnly={showAccessibleOnly}
          totalAccessible={totalAccessible}
          totalEV={totalEV}
        />
      ) : (
        <EmptyState />
      )}
    </div>
  );
}

function PageHeader({ mobileView, setMobileView }: { mobileView: 'list' | 'grid'; setMobileView: (v: 'list' | 'grid') => void }) {
  return (
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
  );
}

interface ParkingResultsProps {
  filtered: ParkingLot[];
  filterMode: FilterMode;
  mobileView: 'list' | 'grid';
  showAccessibleOnly: boolean;
  totalAccessible: number;
  totalEV: number;
}

function ParkingResults({ filtered, filterMode, mobileView, showAccessibleOnly, totalAccessible, totalEV }: ParkingResultsProps) {
  return (
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

      <div className={`space-y-2 ${mobileView === 'grid' ? 'hidden' : 'flex flex-col'} sm:hidden`} role="list">
        {filtered.map((lot) => (
          <div key={lot.id} role="listitem">
            <CompactParkRow lot={lot} filterMode={filterMode} />
          </div>
        ))}
      </div>

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
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center rounded-2xl p-10 bg-primary/5 border-2 border-dashed border-primary/30" role="status">
      <i className="fas fa-magnifying-glass mb-3 text-primary/50" style={{ fontSize: '2.5rem' }} aria-hidden="true" />
      <p className="text-foreground font-bold" style={{ fontSize: '1rem' }}>Nenhum parque encontrado</p>
      <p className="text-foreground/60 mt-1" style={{ fontSize: '0.85rem' }}>Tente ajustar os filtros ou a pesquisa.</p>
    </div>
  );
}
