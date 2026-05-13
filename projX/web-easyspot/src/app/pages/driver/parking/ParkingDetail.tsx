import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useProfile } from '../../../context/ProfileContext';
import type { ParkingLot } from '../../../data/parkingTypes';
import { LeafletMap } from '../../../components/parking/LeafletMap';
import { InfoBox, amenityIcon, amenityLabel } from './parkingShared';
import { TabGeneral } from './TabGeneral';
import { TabMap } from './TabMap';
import { TabEV } from './TabEV';
import { TabAccessibility } from './TabAccessibility';
import { TabTariffs } from './TabTariffs';
import { fetchParkDetails, fetchParkFavoriteStatus, toggleParkFavorite } from '../../../services/parksApi';

type Tab = 'general' | 'map' | 'ev' | 'accessibility' | 'tariffs';

function getOccupancyStatus(availableSpots: number, totalSpots: number) {
  const safeTotal = Math.max(0, totalSpots);
  const safeAvailable = Math.min(safeTotal, Math.max(0, availableSpots));
  const isFull = safeAvailable === 0;
  const isAlmostFull = !isFull && safeAvailable <= Math.ceil(safeTotal * 0.2);

  let statusHex = '#22c55e';
  let statusLabel = 'Disponível';
  if (isFull) {
    statusHex = '#ef4444';
    statusLabel = 'Lotado';
  } else if (isAlmostFull) {
    statusHex = '#f59e0b';
    statusLabel = 'Quase cheio';
  }

  return { isFull, isAlmostFull, statusHex, statusLabel };
}

export function ParkingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { vehicles } = useProfile();
  const myVehicle = useMemo(() => vehicles.find((v) => v.isPrimary) ?? vehicles[0] ?? null, [vehicles]);

  const [lot, setLot] = useState<ParkingLot | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [activeFloorIdx, setActiveFloorIdx] = useState(0);

  const totalEV  = lot?.evChargers?.length ?? 0;
  const totalAcc = lot?.accessibleSpots?.length ?? 0;

  const initialTab = useMemo<Tab>(() => {
    if (!lot) return 'general';
    if (myVehicle?.isEV && totalEV > 0) return 'ev';
    if (myVehicle?.isAccessible && totalAcc > 0) return 'accessibility';
    return 'general';
  }, [lot?.id, myVehicle?.id]);

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const details = await fetchParkDetails(id);
        if (!mounted) return;
        setLot(details);
        try {
          const favoriteStatus = await fetchParkFavoriteStatus(id);
          if (mounted) setIsFavorite(favoriteStatus.isFavorite);
        } catch {
          if (mounted) setIsFavorite(false);
        }
      } catch {
        if (mounted) setLot(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return <div className="p-6 text-muted-foreground">A carregar parque...</div>;
  }

  if (!lot) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center bg-background">
        <i className="fas fa-circle-exclamation text-muted-foreground text-5xl mb-4" aria-hidden="true" />
        <h1 className="text-xl font-bold text-foreground">Parque não encontrado</h1>
        <p className="text-muted-foreground text-sm mt-2 mb-6">O parque que procura não existe ou foi removido.</p>
        <Link to="/" className="btn btn-primary rounded-full px-6 text-sm">
          <i className="fas fa-arrow-left mr-2" aria-hidden="true" />Voltar à lista
        </Link>
      </div>
    );
  }

  const totalSpots = Math.max(0, lot.totalSpots);
  const availableSpots = Math.min(totalSpots, Math.max(0, lot.availableSpots));
  const occupied = Math.max(0, totalSpots - availableSpots);
  const occupancyPct = totalSpots > 0 ? Math.round((occupied / totalSpots) * 100) : 0;
  const { isFull, isAlmostFull, statusHex, statusLabel } = getOccupancyStatus(availableSpots, totalSpots);
  const availableEV  = lot.evChargers?.filter((c) => c.available).length ?? 0;
  const availableAcc = lot.accessibleSpots?.filter((s) => s.available).length ?? 0;

  const tabs: { id: Tab; icon: string; label: string; short: string }[] = [
    { id: 'general',      icon: 'fa-info-circle',       label: 'Geral',           short: 'Geral' },
    ...(lot.floors?.length ? [{ id: 'map' as Tab,        icon: 'fa-map',              label: 'Mapa',            short: 'Mapa' }] : []),
    ...(totalEV > 0        ? [{ id: 'ev' as Tab,         icon: 'fa-charging-station', label: 'Carregamento EV', short: 'EV' }] : []),
    ...(totalAcc > 0       ? [{ id: 'accessibility' as Tab, icon: 'fa-wheelchair',    label: 'Acessibilidade',  short: 'Acess.' }] : []),
    { id: 'tariffs',      icon: 'fa-euro-sign',         label: 'Tarifas',         short: 'Tarifas' },
  ];

  return (
    <div className="w-full max-w-[1200px] mx-auto p-3 lg:p-5 min-h-[calc(100vh-56px)] bg-background font-sans overscroll-y-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">

        {/* Left column */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="rounded-2xl overflow-hidden shadow-lg" style={{ background: 'linear-gradient(135deg, #7357ec 0%, #4a3696 100%)' }}>
            <div className="flex items-start justify-between p-4 pb-1">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                aria-label="Voltar"
              >
                <i className="fas fa-arrow-left text-sm" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!lot || favoriteLoading) return;
                  try {
                    setFavoriteLoading(true);
                    const result = await toggleParkFavorite(lot.id);
                    setIsFavorite(result.isFavorite);
                  } catch {
                    // Keep current state when request fails.
                  } finally {
                    setFavoriteLoading(false);
                  }
                }}
                disabled={favoriteLoading}
                aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                  isFavorite ? 'bg-warning text-white shadow-md shadow-warning/30' : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
                }`}
              >
                <i className="fas fa-star text-sm" />
              </button>
            </div>

            <div className="px-5 pb-5 text-white">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="px-2 py-0.5 rounded text-xs uppercase font-bold" style={{ background: statusHex, color: '#fff' }}>{statusLabel}</span>
                {lot.is24h && <span className="px-2 py-0.5 rounded bg-white/20 text-xs font-bold text-white">24H</span>}
              </div>
              <h1 className="text-2xl font-bold leading-tight mb-1 truncate">{lot.name}</h1>
              <p className="text-white/80 text-sm flex items-center gap-1.5 truncate">
                <i className="fas fa-location-dot" />{lot.address}
              </p>
            </div>

            <div className="mx-4 mb-4 rounded-xl bg-white/10 backdrop-blur-sm p-3">
              <div className="flex justify-between items-end mb-1">
                <div>
                  <p className="text-white/60 text-xs uppercase font-bold mb-0.5">Livres</p>
                  <p className="text-3xl font-black text-white leading-none">{availableSpots}</p>
                </div>
                <div className="text-right">
                  <p className="text-white/80 text-xs font-semibold mb-0.5">de {totalSpots}</p>
                  <p className="text-white text-lg font-bold" style={{ color: statusHex }}>{occupancyPct}%</p>
                </div>
              </div>
            </div>

            <div className="px-4 pb-4 mt-1">
              {isFull ? (
                <button type="button" disabled className="w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 bg-black/20 text-white/50 cursor-not-allowed">
                  <i className="fas fa-ban" />Lotado
                </button>
              ) : (
                <Link
                  to={`/reservation?parkId=${lot.id}`}
                  className="w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-[0.98] bg-white text-primary hover:bg-gray-50 shadow-md no-underline"
                >
                  <i className="fas fa-calendar-check" />Reservar
                </Link>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <InfoBox icon="fa-euro-sign" label="Por Hora"  value={`€ ${lot.hourlyRate.toFixed(2)}/h`} color="text-primary" />
            <InfoBox icon="fa-clock"     label="Horário"   value={lot.is24h ? '24h' : lot.openingHours} color="text-primary" />
          </div>

          {(lot.amenities.length > 0 || totalEV > 0 || totalAcc > 0) && (
            <div className="bg-card rounded-xl p-4 border border-border">
              <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">Comodidades</h3>
              <div className="flex flex-wrap gap-1.5">
                {totalEV > 0 && (
                  <span className={`px-2 py-1 rounded text-sm font-semibold ${availableEV > 0 ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}>
                    <i className="fas fa-charging-station mr-1" /> {availableEV}/{totalEV} EV
                  </span>
                )}
                {totalAcc > 0 && (
                  <span className={`px-2 py-1 rounded text-sm font-semibold ${availableAcc > 0 ? 'bg-info/15 text-info' : 'bg-muted text-muted-foreground'}`}>
                    <i className="fas fa-wheelchair mr-1" /> {availableAcc} Acess.
                  </span>
                )}
                {lot.amenities.map((a, i) => (
                  <span key={`${a}-${i}`} className="px-2 py-1 rounded text-sm font-medium bg-muted text-muted-foreground border border-border">
                    <i className={`fas ${amenityIcon(a)} mr-1 opacity-70`} /> {amenityLabel(a)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="rounded-2xl overflow-hidden h-[180px] md:h-[220px] border border-border shadow-sm relative">
            <LeafletMap lots={[lot]} selectedId={lot.id} singleLot={lot} height="100%" />
            <a
              href={`https://www.openstreetmap.org/directions?from=&to=${lot.latitude},${lot.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-3 right-3 bg-primary text-white px-3 py-2 rounded-lg text-sm font-bold shadow-md flex items-center gap-1.5 hover:scale-105 transition-transform z-[400]"
            >
              <i className="fas fa-location-arrow" /> Navegar
            </a>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm flex flex-col flex-1 pb-4">
            <div className="border-b border-border w-full overflow-hidden">
              <div className="flex w-full">
                {tabs.map((tab) => (
                  <button
                    type="button"
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-3 px-1 text-center font-bold text-xs sm:text-sm transition-colors border-b-2 whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    <i className={`fas ${tab.icon} md:mr-1 block md:inline mb-0.5 md:mb-0`} />
                    <span className="block md:inline">{tab.short}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 sm:p-5 flex-1">
              {activeTab === 'general' && (
                <TabGeneral lot={lot} occupied={occupied} occupancyPct={occupancyPct} isFull={isFull} isAlmostFull={isAlmostFull} statusHex={statusHex} />
              )}
              {activeTab === 'map' && (
                <TabMap lot={lot} activeFloorIdx={activeFloorIdx} setActiveFloorIdx={setActiveFloorIdx} />
              )}
              {activeTab === 'ev' && <TabEV lot={lot} myVehicle={myVehicle} />}
              {activeTab === 'accessibility' && <TabAccessibility lot={lot} />}
              {activeTab === 'tariffs' && <TabTariffs lot={lot} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
