import { useEffect, useMemo } from 'react';
import type { ParkingLot, ParkingSpot } from '../../../data/parkingTypes';
import { SPOT_FILTER_OPTIONS, isSpotSelectable, spotColorClasses, type SpotFilter } from './reservationHelpers';

export function Step2SpotChoice({
  lot, spotFilter, onSpotFilterChange,
  selectedFloorId, setSelectedFloorId,
  selectedSpotId, setSelectedSpotId,
  onNext, onBack,
}: Readonly<{
  lot: ParkingLot;
  spotFilter: SpotFilter; onSpotFilterChange: (f: SpotFilter) => void;
  selectedFloorId: string; setSelectedFloorId: (id: string) => void;
  selectedSpotId: string; setSelectedSpotId: (id: string) => void;
  onNext: () => void; onBack: () => void;
}>) {
  const floor = lot.floors.find(f => f.id === selectedFloorId) || lot.floors[0];
  const selectedSpot = floor?.spots.find(s => s.id === selectedSpotId) || null;
  const spotContent = (spot: ParkingSpot, selected: boolean) => {
    if (selected) return <i className="fa-solid fa-check text-[8px]" />;
    if (spot.status === 'ev') return <i className="fa-solid fa-bolt text-[8px]" />;
    if (spot.status === 'accessible') return <i className="fa-solid fa-wheelchair text-[8px]" />;
    return spot.label;
  };

  const spotsByRow = useMemo(() => {
    if (!floor) return {};
    const grouped = floor.spots.reduce((acc, spot) => {
      if (!acc[spot.row]) acc[spot.row] = [];
      acc[spot.row].push(spot);
      return acc;
    }, {} as Record<number, ParkingSpot[]>);
    for (const row of Object.keys(grouped)) {
      grouped[Number(row)].sort((a, b) => a.col - b.col);
    }
    return grouped;
  }, [floor]);

  const freeCounts = useMemo(() => {
    if (!floor) return { free: 0, ev: 0, accessible: 0, occupied: 0, reserved: 0, out_of_service: 0 };
    return floor.spots.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [floor]);
  const selectableSpots = useMemo(
    () => (floor?.spots ?? []).filter((spot) => isSpotSelectable(spot, spotFilter)),
    [floor?.spots, spotFilter]
  );

  useEffect(() => {
    if (!selectedSpotId && selectableSpots.length === 1) {
      setSelectedSpotId(selectableSpots[0].id);
    }
  }, [selectableSpots, selectedSpotId, setSelectedSpotId]);

  const pickBestSpot = () => {
    if (!floor) return;
    const byPriority = floor.spots.filter((spot) => isSpotSelectable(spot, spotFilter))
      .sort((a, b) => {
        if (a.row !== b.row) return a.row - b.row;
        return a.col - b.col;
      });
    if (byPriority[0]) setSelectedSpotId(byPriority[0].id);
  };
  const isSpotMatchingFilter = (spot: ParkingSpot) => {
    if (spotFilter === 'todos') return true;
    if (spotFilter === 'ev') return spot.status === 'ev';
    if (spotFilter === 'accessible') return spot.status === 'accessible';
    if (spotFilter === 'standard') return spot.status === 'free' || spot.status === 'occupied' || spot.status === 'reserved' || spot.status === 'out_of_service';
    return true;
  };

  const rowLabel = (row: number) => String.fromCharCode(65 + row);

  return (
    <div className="space-y-4">
      {lot.floors.length > 1 && (
        <div className="flex gap-2 flex-wrap" aria-label="Selecionar piso">
          {lot.floors.map(f => (
            <button
              key={f.id}
              aria-pressed={f.id === selectedFloorId}
              onClick={() => { setSelectedFloorId(f.id); setSelectedSpotId(''); }}
              className={`btn btn-sm rounded-full transition-all ${f.id === selectedFloorId ? 'btn-primary' : 'btn-outline btn-primary'}`}
            >
              <i className="fa-solid fa-layer-group mr-1.5" />
              {f.name}
            </button>
          ))}
        </div>
      )}

      <div className="card bg-base-200 shadow-md">
        <div className="card-body p-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-2 flex-wrap" aria-label="Filtrar tipo de lugar">
              {SPOT_FILTER_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => { onSpotFilterChange(opt.key); setSelectedSpotId(''); }}
                  className={`btn btn-xs rounded-full gap-1 ${spotFilter === opt.key ? 'btn-primary' : 'btn-ghost text-base-content/60 hover:bg-base-300'}`}
                  aria-pressed={spotFilter === opt.key}
                >
                  <i className={opt.icon} /> {opt.label}
                </button>
              ))}
            </div>
            <div className="flex gap-3 text-xs text-base-content/60 flex-wrap">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-success border border-success-content/30 inline-block" /> Livre ({freeCounts.free || 0})</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-error border border-error-content/30 inline-block" /> Ocupado ({freeCounts.occupied || 0})</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{background:'#d97706'}} /> Reservado ({freeCounts.reserved || 0})</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{background:'#374151'}} /> Avariado ({freeCounts.out_of_service || 0})</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-warning border border-warning-content/30 inline-block" /> EV ({freeCounts.ev || 0})</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-info border border-info-content/30 inline-block" /> Acessível ({freeCounts.accessible || 0})</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-primary inline-block" /> Selecionado</span>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs text-base-content/70">
              {selectableSpots.length} lugar(es) disponível(is) para o filtro atual
            </span>
            <button
              type="button"
              onClick={pickBestSpot}
              disabled={selectableSpots.length === 0}
              className="btn btn-xs btn-outline btn-primary rounded-full"
            >
              <i className="fa-solid fa-wand-magic-sparkles mr-1" />
              Escolher melhor disponível
            </button>
          </div>
        </div>
      </div>

      <div className="card bg-base-200 shadow-md">
        <div className="card-body p-4">
          <div className="flex items-center justify-center mb-3">
            <div className="flex items-center gap-2 bg-base-100 rounded-full px-4 py-1.5 border border-base-300">
              <i className="fa-solid fa-arrow-down text-primary" />
              <span className="text-xs font-semibold text-base-content/70 uppercase tracking-wider">Entrada / Saída</span>
              <i className="fa-solid fa-arrow-down text-primary" />
            </div>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="inline-block min-w-full">
              {Object.entries(spotsByRow).map(([rowStr, spots]) => {
                const row = Number(rowStr);
                return (
                  <div key={row} className="flex items-center gap-1 mb-1.5">
                    <div className="w-5 shrink-0 text-center text-xs font-bold text-base-content/40 select-none">
                      {rowLabel(row)}
                    </div>
                    {spots.map((spot, colIdx) => {
                      const selectable = isSpotSelectable(spot, spotFilter);
                      const selected = spot.id === selectedSpotId;
                      const classes = spotColorClasses(spot, selected, selectable);
                      const matchesFilter = isSpotMatchingFilter(spot);
                      const needsAisle = colIdx === Math.floor(spots.length / 2);
                      return (
                        <div key={spot.id} className="flex gap-0 items-center">
                          {needsAisle && <div className="w-4 shrink-0" aria-hidden="true" />}
                          <button
                            onClick={() => {
                              if (selected) {
                                setSelectedSpotId('');
                                return;
                              }
                              if (selectable) setSelectedSpotId(spot.id);
                            }}
                            disabled={!selectable && !selected}
                            title={`${spot.label} — ${spot.status}`}
                            aria-label={`Lugar ${spot.label}`}
                            aria-pressed={selected}
                            className={`w-7 h-7 md:w-8 md:h-8 shrink-0 rounded border flex items-center justify-center text-[9px] md:text-[10px] font-bold transition-all duration-150 select-none focus:outline-none focus:ring-2 focus:ring-primary/50 ${classes} ${!matchesFilter && !selected ? 'opacity-35 saturate-50' : ''}`}
                          >
                            {spotContent(spot, selected)}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
          {spotFilter !== 'todos' && selectableSpots.length === 0 && (
            <div className="mt-3 text-center text-xs text-base-content/65">
              Não há lugares disponíveis para este filtro neste piso.
            </div>
          )}

          {selectedSpot && (
            <div className="mt-3 p-3 bg-primary/10 rounded-xl border border-primary/20 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0">
                <span className="text-primary-content font-bold text-sm">{selectedSpot.label}</span>
              </div>
              <div>
                <p className="font-semibold text-base-content text-sm">Lugar {selectedSpot.label} selecionado</p>
                <p className="text-xs text-base-content/60">
                  {floor.name}
                  {selectedSpot.status === 'ev' && ' · Carregamento EV disponível'}
                  {selectedSpot.status === 'accessible' && ' · Lugar de mobilidade reduzida'}
                </p>
              </div>
              <button
                onClick={() => setSelectedSpotId('')}
                className="btn btn-xs btn-ghost rounded-full ml-auto"
                aria-label="Remover seleção"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="btn btn-ghost rounded-full flex-1 border border-base-300">
          <i className="fa-solid fa-arrow-left mr-2" /> Voltar
        </button>
        <button
          onClick={onNext}
          disabled={!selectedSpotId}
          className="btn btn-primary rounded-full flex-1 shadow-lg shadow-primary/30 disabled:opacity-40"
        >
          Confirmar Lugar <i className="fa-solid fa-arrow-right ml-2" />
        </button>
      </div>
    </div>
  );
}
