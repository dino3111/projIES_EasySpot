import { useState, useEffect } from 'react';
import { FilterBar } from '../../components/parking/FilterBar';
import { ParkingCard, type FilterMode } from '../../components/parking/ParkingCard';
import { VehiclePicker } from '../../components/shared/VehiclePicker';
import type { ParkingLot } from '../../data/parkingTypes';
import { useProfile } from '../../context/ProfileContext';
import { CompactParkRow } from './components/CompactParkRow';
import { FilterBanners } from './components/FilterBanners';
import { fetchParkCities, fetchParksList } from '../../services/parksApi';

export function ParkingListPage() {
  const { vehicles } = useProfile();
  const primaryVehicle = vehicles.find((v) => v.isPrimary) ?? vehicles[0] ?? null;

  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showEVOnly, setShowEVOnly] = useState(false);
  const [showAccessibleOnly, setShowAccessibleOnly] = useState(false);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'grid'>('list');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(primaryVehicle?.id ?? null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [districts, setDistricts] = useState<string[]>([]);

  useEffect(() => {
    const vehicle = vehicles.find((v) => v.id === selectedVehicleId) ?? null;
    setShowEVOnly(vehicle?.isEV ?? false);
    setShowAccessibleOnly(vehicle?.isAccessible ?? false);
  }, [selectedVehicleId, vehicles]);

  useEffect(() => {
    let mounted = true;
    fetchParkCities().then((cities) => {
      if (mounted) setDistricts(cities);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [showEVOnly, showAccessibleOnly, showAvailableOnly, searchQuery, selectedDistrict, selectedVehicleId]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const data = await fetchParksList({
          page,
          pageSize: 20,
          textQuery: searchQuery || undefined,
          city: selectedDistrict || undefined,
          vehicleId: selectedVehicleId,
          evOnly: showEVOnly,
          accessibleOnly: showAccessibleOnly,
          availableOnly: showAvailableOnly,
        });
        if (!mounted) return;
        setParkingLots(data.items);
        setTotalPages(data.pagination.totalPages);
      } catch {
        if (mounted) setLoadError('Não foi possível carregar parques do backend.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [page, showEVOnly, showAccessibleOnly, showAvailableOnly, searchQuery, selectedDistrict, selectedVehicleId]);

  let filterMode: FilterMode = null;
  if (showAccessibleOnly && showEVOnly) {
    filterMode = 'both';
  } else if (showAccessibleOnly) {
    filterMode = 'accessible';
  } else if (showEVOnly) {
    filterMode = 'ev';
  }

  const filtered = parkingLots;

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

      {loading && <p className="text-muted-foreground text-sm mb-3">A carregar parques...</p>}
      {loadError && <p className="text-error text-sm mb-3">{loadError}</p>}

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
      <div className="mt-4 flex items-center justify-between">
        <button className="btn btn-sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</button>
        <span className="text-sm text-muted-foreground">Página {page} / {Math.max(totalPages, 1)}</span>
        <button className="btn btn-sm" disabled={loading || (totalPages > 0 && page >= totalPages)} onClick={() => setPage((p) => p + 1)}>Seguinte</button>
      </div>
    </div>
  );
}

interface PageHeaderProps {
  readonly mobileView: 'list' | 'grid';
  readonly setMobileView: (v: 'list' | 'grid') => void;
}

function PageHeader({ mobileView, setMobileView }: PageHeaderProps) {
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
  readonly filtered: ParkingLot[];
  readonly filterMode: FilterMode;
  readonly mobileView: 'list' | 'grid';
  readonly showAccessibleOnly: boolean;
  readonly totalAccessible: number;
  readonly totalEV: number;
}

function ParkingResults({ filtered, filterMode, mobileView, showAccessibleOnly, totalAccessible, totalEV }: ParkingResultsProps) {
  return (
    <>
      <output className="mb-3 text-muted-foreground font-medium block" style={{ fontSize: '0.8rem' }} aria-live="polite">
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
      </output>

      <ul className={`space-y-2 ${mobileView === 'grid' ? 'hidden' : 'flex flex-col'} sm:hidden`}>
        {filtered.map((lot) => (
          <li key={lot.id}>
            <CompactParkRow lot={lot} filterMode={filterMode} />
          </li>
        ))}
      </ul>

      <div
        className={`grid gap-3 lg:gap-4 ${
          mobileView === 'grid'
            ? 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            : 'hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        }`}
        style={{ alignItems: 'stretch' }}
      >
        {filtered.map((lot) => (
          <div key={lot.id} className="flex flex-col">
            <ParkingCard lot={lot} highlightAccessible={showAccessibleOnly} filterMode={filterMode} />
          </div>
        ))}
      </div>
    </>
  );
}

function EmptyState() {
  return (
    <output className="flex flex-col items-center justify-center text-center rounded-2xl p-10 bg-primary/5 border-2 border-dashed border-primary/30">
      <i className="fas fa-magnifying-glass mb-3 text-primary/50" style={{ fontSize: '2.5rem' }} aria-hidden="true" />
      <p className="text-foreground font-bold" style={{ fontSize: '1rem' }}>Nenhum parque encontrado</p>
      <p className="text-foreground/60 mt-1" style={{ fontSize: '0.85rem' }}>Tente ajustar os filtros ou a pesquisa.</p>
    </output>
  );
}
