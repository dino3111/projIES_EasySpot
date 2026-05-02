import { useMemo } from 'react';
import type { ParkingLot, ParkingSpot } from '../../../data/parkingData';
import { SPOT_FILTER_OPTIONS, isSpotSelectable, spotColorClasses, type SpotFilter } from './reservationHelpers';

export function Step2SpotChoice({
  lot, spotFilter, setSpotFilter,
  selectedFloorId, setSelectedFloorId,
  selectedSpotId, setSelectedSpotId,
  onNext, onBack,
}: {
  lot: ParkingLot;
  spotFilter: SpotFilter; setSpotFilter: (f: SpotFilter) => void;
  selectedFloorId: string; setSelectedFloorId: (id: string) => void;
  selectedSpotId: string; setSelectedSpotId: (id: string) => void;
  onNext: () => void; onBack: () => void;
}) {
  const floor = lot.floors.find(f => f.id === selectedFloorId) || lot.floors[0];
  const selectedSpot = floor?.spots.find(s => s.id === selectedSpotId) || null;

  const spotsByRow = useMemo(() => {
    if (!floor) return {};
    return floor.spots.reduce((acc, spot) => {
      if (!acc[spot.row]) acc[spot.row] = [];
      acc[spot.row].push(spot);
      return acc;
    }, {} as Record<number, ParkingSpot[]>);
  }, [floor]);

  const freeCounts = useMemo(() => {
    if (!floor) return { free: 0, ev: 0, accessible: 0, occupied: 0, reserved: 0 };
    return floor.spots.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [floor]);

  const rowLabel = (row: number) => String.fromCharCode(65 + row);

  return (
    <div className="space-y-4">
      {lot.floors.length > 1 && (
        <div className="flex gap-2 flex-wrap" role="tablist" aria-label="Selecionar piso">
          {lot.floors.map(f => (
            <button
              key={f.id}
              role="tab"
              aria-selected={f.id === selectedFloorId}
              onClick={() => { setSelectedFloorId(f.id); setSelectedSpotId(''); }}
              className={`btn btn-sm rounded-full transition-all ${f.id === selectedFloorId ? 'btn-primary' : 'btn-outline btn-primary'}`}
            >
              <i className="fa-solid fa-layer-group mr-1.5" />{f.name}
            </button>
          ))}
        </div>
      )}

      <div className="card bg-base-200 shadow-md">
        <div className="card-body p-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-2 flex-wrap" role="group" aria-label="Filtrar tipo de lugar">
              {SPOT_FILTER_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => { setSpotFilter(opt.key); setSelectedSpotId(''); }}
                  className={`btn btn-xs rounded-full gap-1 ${spotFilter === opt.key ? 'btn-primary' : 'btn-ghost text-base-content/60 hover:bg-base-300'}`}
                  aria-pressed={spotFilter === opt.key}
                >
                  <i className={opt.icon} /> {opt.label}
                </button>
              ))}
            </div>
            <div className="flex gap-3 text-xs text-base-content/60 flex-wrap">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-success/80 inline-block" /> Livre ({freeCounts.free || 0})</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-error/80 inline-block" /> Ocupado ({freeCounts.occupied || 0})</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-warning inline-block" /> EV ({freeCounts.ev || 0})</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-info inline-block" /> Acessível ({freeCounts.accessible || 0})</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-primary inline-block" /> Selecionado</span>
            </div>
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
                    {(spots as ParkingSpot[]).map((spot, colIdx) => {
                      const selectable = isSpotSelectable(spot, spotFilter);
                      const selected = spot.id === selectedSpotId;
                      const classes = spotColorClasses(spot, selected, selectable);
                      const needsAisle = colIdx === Math.floor((spots as ParkingSpot[]).length / 2);
                      return (
                        <div key={spot.id} className="flex gap-0 items-center">
                          {needsAisle && <div className="w-4 shrink-0" aria-hidden="true" />}
                          <button
                            onClick={() => selectable && setSelectedSpotId(selected ? '' : spot.id)}
                            disabled={!selectable}
                            title={`${spot.label} — ${spot.status}`}
                            aria-label={`Lugar ${spot.label}`}
                            aria-pressed={selected}
                            className={`w-7 h-7 md:w-8 md:h-8 shrink-0 rounded border flex items-center justify-center text-[9px] md:text-[10px] font-bold transition-all duration-150 select-none focus:outline-none focus:ring-2 focus:ring-primary/50 ${classes}`}
                          >
                            {selected
                              ? <i className="fa-solid fa-check text-[8px]" />
                              : spot.status === 'ev'
                                ? <i className="fa-solid fa-bolt text-[8px]" />
                                : spot.status === 'accessible'
                                  ? <i className="fa-solid fa-wheelchair text-[8px]" />
                                  : spot.label
                            }
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

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
