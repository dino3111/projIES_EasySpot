import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import type { ParkingLot } from '../../data/parkingTypes';
import { LeafletMap } from '../../components/parking/LeafletMap';
import { fetchAllParksSummary } from '../../services/parksCatalog';
import { fetchSensorList, type SensorSummary } from '../../services/technicianApi';

type FilterType = 'todos' | 'problemas' | 'operacionais';

export function TechMapPage() {
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('todos');
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [sensors, setSensors] = useState<SensorSummary[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAllParksSummary().then(setParkingLots).catch(() => setParkingLots([]));
    fetchSensorList().then(setSensors).catch(() => setSensors([]));
  }, []);

  const filteredLots = useMemo(() => {
    return parkingLots.filter((lot) => {
      if (activeFilter !== 'todos') {
        const parkSensors = sensors.filter(s => s.parkingLotId.toString() === lot.id);
        const hasProblems = parkSensors.some(s => s.status !== 'operational');
        if (activeFilter === 'problemas' && !hasProblems) return false;
        if (activeFilter === 'operacionais' && hasProblems) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!lot.name.toLowerCase().includes(q) && !lot.address.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [parkingLots, sensors, activeFilter, searchQuery]);

  const selectedLot = parkingLots.find((l) => l.id === selectedLotId) ?? null;

  const handleSelectLot = useCallback((id: string) => {
    setSelectedLotId(id);
  }, []);

  const getParkHealth = (lot: ParkingLot) => {
    const parkSensors = sensors.filter(s => s.parkingLotId.toString() === lot.id);
    const healthy = parkSensors.filter(s => s.status === 'operational').length;
    const total = parkSensors.length;
    const pct = total > 0 ? Math.round((healthy / total) * 100) : 100;
    const color = pct === 100 ? '#22c55e' : pct >= 70 ? '#f59e0b' : '#d4183d';
    return { healthy, total, pct, color };
  };

  const FILTERS: { id: FilterType; icon: string; label: string }[] = [
    { id: 'todos',        icon: 'fa-layer-group',        label: 'Todos' },
    { id: 'operacionais', icon: 'fa-circle-check',       label: 'Operacionais' },
    { id: 'problemas',    icon: 'fa-circle-exclamation', label: 'Com Problemas' },
  ];

  return (
    <div className="relative w-full flex overflow-hidden bg-background overscroll-none" style={{ height: 'calc(100vh - 56px)' }}>

      <div className="absolute inset-0 z-0 bg-muted">
        <LeafletMap
          lots={filteredLots}
          selectedId={selectedLotId}
          onSelect={handleSelectLot}
          height="100%"
        />
      </div>

      <div className="absolute top-3 left-3 right-3 z-10 pointer-events-none">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="flex items-center gap-2 bg-card/95 backdrop-blur-md rounded-2xl px-4 py-2.5 shadow-xl border border-border pointer-events-auto md:w-72 flex-shrink-0">
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
                onClick={() => setSearchQuery('')}
                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                aria-label="Limpar pesquisa"
              >
                <i className="fas fa-xmark" />
              </button>
            )}
          </div>

          <div className="flex gap-2 pointer-events-auto overflow-x-auto scrollbar-none overscroll-x-contain">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-full border transition-all whitespace-nowrap text-sm font-medium ${
                  activeFilter === f.id
                    ? 'bg-primary text-white border-primary'
                    : 'bg-card/90 border-border hover:border-primary/50'
                }`}
              >
                <i className={`fas ${f.icon}`} style={{ fontSize: '0.9rem' }} aria-hidden="true" />
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {selectedLot && (
        <div className="absolute bottom-3 right-3 z-20 pointer-events-auto">
          <div className="bg-card/95 backdrop-blur-md border border-border rounded-2xl p-4 shadow-xl max-w-sm">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <h3 className="text-foreground font-bold" style={{ fontSize: '1rem' }}>{selectedLot.name}</h3>
                <p className="text-muted-foreground text-xs mt-0.5">
                  <i className="fas fa-map-pin mr-1" aria-hidden="true"></i>
                  {selectedLot.address}
                </p>
              </div>
              <button
                onClick={() => setSelectedLotId(null)}
                className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Fechar"
              >
                <i className="fas fa-xmark" />
              </button>
            </div>

            {(() => {
              const health = getParkHealth(selectedLot);
              return (
                <div className="space-y-2">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-foreground text-xs font-semibold">Saúde de Sensores</span>
                      <span className="text-foreground font-bold" style={{ fontSize: '0.85rem', color: health.color }}>
                        {health.pct}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${health.pct}%`, background: health.color }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div className="rounded-lg p-2 bg-green-500/10 text-center">
                      <p className="text-green-600 font-bold text-sm">{health.healthy}</p>
                      <p className="text-muted-foreground text-xs">Operacionais</p>
                    </div>
                    <div className="rounded-lg p-2 bg-red-500/10 text-center">
                      <p className="text-red-600 font-bold text-sm">{health.total - health.healthy}</p>
                      <p className="text-muted-foreground text-xs">Problemas</p>
                    </div>
                    <div className="rounded-lg p-2 bg-blue-500/10 text-center">
                      <p className="text-blue-600 font-bold text-sm">{health.total}</p>
                      <p className="text-muted-foreground text-xs">Total</p>
                    </div>
                  </div>

                  {selectedLot.is24h ? (
                    <div className="mt-2 px-2 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-primary text-xs font-semibold">
                        <i className="fas fa-clock mr-1.5" aria-hidden="true"></i>
                        Aberto 24h
                      </p>
                    </div>
                  ) : (
                    <div className="mt-2 px-2 py-1.5 rounded-lg bg-muted border border-border">
                      <p className="text-muted-foreground text-xs font-semibold">
                        <i className="fas fa-clock mr-1.5" aria-hidden="true"></i>
                        {selectedLot.openingHours}
                      </p>
                    </div>
                  )}

                  <div className="mt-2 px-2 py-1.5 rounded-lg bg-card border border-border">
                    <a href={`tel:${selectedLot.phone}`} className="text-primary text-xs font-semibold hover:underline">
                      <i className="fas fa-phone mr-1.5" aria-hidden="true"></i>
                      {selectedLot.phone}
                    </a>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
