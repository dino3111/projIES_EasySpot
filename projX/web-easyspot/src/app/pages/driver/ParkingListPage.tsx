import { useState, useEffect, useRef } from 'react';
import { FilterBar } from '../../components/parking/FilterBar';
import { ParkingCard, type FilterMode } from '../../components/parking/ParkingCard';
import { VehiclePicker } from '../../components/shared/VehiclePicker';
import type { ParkingLot } from '../../data/parkingTypes';
import { useProfile } from '../../context/ProfileContext';
import { CompactParkRow } from './components/CompactParkRow';
import { FilterBanners } from './components/FilterBanners';
import { fetchParkCities, fetchParksList, subscribeSpaceAvailableAlerts, haversineKm, formatDistance, formatWalkingTime } from '../../services/parksApi';

interface QueryState {
  page: number;
  showEVOnly: boolean;
  showAccessibleOnly: boolean;
  showAvailableOnly: boolean;
  searchQuery: string;
  selectedDistrict: string;
  selectedVehicleId: string | null;
}
const REALTIME_REFRESH_MS = 8000;

export function ParkingListPage() {
  const { vehicles, driverTypes } = useProfile();
  const primaryVehicle = vehicles.find((v) => v.isPrimary) ?? vehicles[0] ?? null;

  const resolveProfileFilters = () => {
    const prefersEv = driverTypes.includes('ev');
    const prefersAccessible = driverTypes.includes('reduced_mobility');
    if (prefersEv || prefersAccessible) return { evOnly: prefersEv, accessibleOnly: prefersAccessible };
    return {
      evOnly: primaryVehicle?.isEV ?? false,
      accessibleOnly: primaryVehicle?.isAccessible ?? false,
    };
  };

  const profileFilters = resolveProfileFilters();

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [districts, setDistricts] = useState<string[]>([]);
  const [mobileView, setMobileView] = useState<'list' | 'grid'>('list');
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeMessage, setSubscribeMessage] = useState<string | null>(null);

  const [query, setQuery] = useState<QueryState>(() => {
    const vehicle = primaryVehicle;
    return {
      page: 1,
      showEVOnly: profileFilters.evOnly || (vehicle?.isEV ?? false),
      showAccessibleOnly: profileFilters.accessibleOnly || (vehicle?.isAccessible ?? false),
      showAvailableOnly: false,
      searchQuery: '',
      selectedDistrict: '',
      selectedVehicleId: vehicle?.id ?? null,
    };
  });

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => { /* permission denied or unavailable — keep null */ },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  useEffect(() => {
    if (!userCoords) return;
    setParkingLots((prev) =>
      prev.map((lot) => {
        const km = haversineKm(userCoords.lat, userCoords.lng, lot.latitude, lot.longitude);
        return { ...lot, distance: formatDistance(km), walkingTime: formatWalkingTime(km) };
      }),
    );
  }, [userCoords]);

  // Track whether the user has manually chosen a vehicle so we don't overwrite their selection.
  const userSelectedVehicleRef = useRef(false);

  useEffect(() => {
    if (userSelectedVehicleRef.current) return;
    setQuery((prev) => ({
      ...prev,
      selectedVehicleId: primaryVehicle?.id ?? null,
      showEVOnly: profileFilters.evOnly,
      showAccessibleOnly: profileFilters.accessibleOnly,
      page: 1,
    }));
  }, [primaryVehicle?.id, primaryVehicle?.isEV, primaryVehicle?.isAccessible, profileFilters.evOnly, profileFilters.accessibleOnly]);

  const setFilter = <K extends keyof Omit<QueryState, 'page'>>(key: K, value: QueryState[K]) => {
    setQuery((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleVehicleSelect = (id: string | null) => {
    userSelectedVehicleRef.current = true;
    const vehicle = vehicles.find((v) => v.id === id) ?? null;
    setQuery((prev) => ({
      ...prev,
      selectedVehicleId: id,
      showEVOnly: vehicle?.isEV ?? false,
      showAccessibleOnly: vehicle?.isAccessible ?? false,
      page: 1,
    }));
  };

  useEffect(() => {
    let mounted = true;
    fetchParkCities().then((cities) => {
      if (mounted) setDistricts(cities);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async (background = false) => {
      try {
        if (!background) {
          setLoading(true);
          setLoadError(null);
        }
        const shouldUseVehicleCompatibility = query.showEVOnly || query.showAccessibleOnly;
        const requestQuery = {
          page: query.page,
          pageSize: 20,
          textQuery: query.searchQuery || undefined,
          city: query.selectedDistrict || undefined,
          vehicleId: shouldUseVehicleCompatibility ? query.selectedVehicleId : null,
          evOnly: query.showEVOnly,
          accessibleOnly: query.showAccessibleOnly,
          availableOnly: query.showAvailableOnly,
        };
        const data = background
          ? await fetchParksList(requestQuery, { background: true })
          : await fetchParksList(requestQuery);
        if (!mounted) return;
        const coords = userCoords;
        const lots = coords
          ? data.items.map((lot) => {
              const km = haversineKm(coords.lat, coords.lng, lot.latitude, lot.longitude);
              return { ...lot, distance: formatDistance(km), walkingTime: formatWalkingTime(km) };
            })
          : data.items;
        setParkingLots(lots);
        setTotalPages(data.pagination.totalPages);
      } catch {
        if (mounted && !background) setLoadError('Não foi possível carregar parques do backend.');
      } finally {
        if (mounted && !background) setLoading(false);
      }
    };
    void load();
    const intervalId = globalThis.setInterval(() => {
      void load(true);
    }, REALTIME_REFRESH_MS);
    return () => {
      mounted = false;
      globalThis.clearInterval(intervalId);
    };
  }, [query]);

  const { showEVOnly, showAccessibleOnly, showAvailableOnly, searchQuery, selectedDistrict, selectedVehicleId, page } = query;

  let filterMode: FilterMode = null;
  if (showAccessibleOnly && showEVOnly) {
    filterMode = 'both';
  } else if (showAccessibleOnly) {
    filterMode = 'accessible';
  } else if (showEVOnly) {
    filterMode = 'ev';
  }

  const filtered = parkingLots;

  const handleSubscribeVisible = async () => {
    if (filtered.length === 0) return;
    try {
      setSubscribing(true);
      setSubscribeMessage(null);
      await subscribeSpaceAvailableAlerts(filtered.map((lot) => lot.id));
      setSubscribeMessage('Alertas ativados para os parques visíveis.');
    } catch {
      setSubscribeMessage('Não foi possível ativar alertas para a listagem atual.');
    } finally {
      setSubscribing(false);
    }
  };

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
          <VehiclePicker vehicles={vehicles} selectedId={selectedVehicleId} onSelect={handleVehicleSelect} />
        </div>
      )}

      <div className="mb-4">
        <FilterBar
          showEVOnly={showEVOnly} showAccessibleOnly={showAccessibleOnly}
          showAvailableOnly={showAvailableOnly} searchQuery={searchQuery}
          selectedDistrict={selectedDistrict} districts={districts}
          onEVFilterChange={(v) => setFilter('showEVOnly', v)}
          onAccessibleFilterChange={(v) => setFilter('showAccessibleOnly', v)}
          onAvailableFilterChange={(v) => setFilter('showAvailableOnly', v)}
          onSearchChange={(v) => setFilter('searchQuery', v)}
          onDistrictChange={(v) => setFilter('selectedDistrict', v)}
        />
      </div>

      <FilterBanners
        filterMode={filterMode}
        totalAccessible={totalAccessible}
        totalEV={totalEV}
        closestAccDistance={closestAccDistance}
        filteredCount={filtered.length}
      />
      <div className="mb-3 flex items-center gap-2">
        <button className="btn btn-sm btn-outline" disabled={subscribing || filtered.length === 0} onClick={() => void handleSubscribeVisible()}>
          <i className="fas fa-bell" aria-hidden="true" /> Alertar-me destes parques
        </button>
        {subscribeMessage && <span className="text-xs text-muted-foreground">{subscribeMessage}</span>}
      </div>

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
        <button className="btn btn-sm" disabled={page <= 1 || loading} onClick={() => setQuery((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}>Anterior</button>
        <span className="text-sm text-muted-foreground">Página {page} / {Math.max(totalPages, 1)}</span>
        <button className="btn btn-sm" disabled={loading || (totalPages > 0 && page >= totalPages)} onClick={() => setQuery((prev) => ({ ...prev, page: prev.page + 1 }))}>Seguinte</button>
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
