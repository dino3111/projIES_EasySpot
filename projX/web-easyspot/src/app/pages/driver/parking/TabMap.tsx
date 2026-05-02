import type { ParkingLot } from '../../../data/parkingData';
import { MapLegend, SpotCell } from './parkingShared';

export function TabMap({
  lot, activeFloorIdx, setActiveFloorIdx,
}: {
  lot: ParkingLot;
  activeFloorIdx: number;
  setActiveFloorIdx: (idx: number) => void;
}) {
  const activeFloor = lot.floors?.[activeFloorIdx];

  return (
    <div className="animate-in fade-in duration-200">
      <div className="flex flex-wrap gap-1.5 mb-4">
        {lot.floors?.map((floor, idx) => (
          <button
            type="button"
            key={floor.id}
            onClick={() => setActiveFloorIdx(idx)}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all border ${
              activeFloorIdx === idx
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:bg-muted'
            }`}
          >
            {floor.name}
          </button>
        ))}
      </div>

      {activeFloor && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-3 bg-muted/30 border-b border-border flex justify-between items-center flex-wrap gap-2 text-sm">
            <span className="font-bold text-foreground">Planta do {activeFloor.name}</span>
            <div className="flex gap-2">
              <MapLegend hex="#22c55e" label="Livre" />
              <MapLegend hex="#ef4444" label="Ocup." />
              <MapLegend hex="#7357ec" label="EV" />
              <MapLegend hex="#0ea5e9" label="Acess." />
            </div>
          </div>
          <div className="p-4 overflow-x-auto scrollbar-none flex justify-center bg-muted/10 overscroll-x-contain">
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${activeFloor.cols}, 35px)` }}>
              {activeFloor.spots.map((spot) => <SpotCell key={spot.id} spot={spot} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
