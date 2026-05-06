import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { ParkingLot } from '../../../data/parkingTypes';
import { ZoneTypeBadge } from './parkingShared';

export function TabGeneral({
  lot, occupied, occupancyPct, isFull, isAlmostFull, statusHex,
}: {
  lot: ParkingLot;
  occupied: number;
  occupancyPct: number;
  isFull: boolean;
  isAlmostFull: boolean;
  statusHex: string;
}) {
  return (
    <div className="animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row gap-4 items-center mb-6 bg-muted/40 p-4 rounded-xl border border-border">
        <div className="w-[120px] h-[120px] relative flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[{ name: 'Livres', value: lot.availableSpots }, { name: 'Ocupados', value: occupied }]}
                cx="50%" cy="50%"
                innerRadius={30} outerRadius={50}
                dataKey="value" stroke="none"
                startAngle={90} endAngle={-270}
                isAnimationActive={false}
              >
                <Cell fill="#22c55e" />
                <Cell fill={isFull ? '#ef4444' : isAlmostFull ? '#f59e0b' : 'var(--muted)'} />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-bold text-foreground text-lg">{occupancyPct}%</span>
          </div>
        </div>
        <div className="flex-1 w-full space-y-2">
          <h3 className="font-bold text-sm text-foreground mb-1">Taxa de Ocupação</h3>
          <div className="flex justify-between items-center bg-card p-2 rounded-lg border border-border">
            <div className="flex gap-2 items-center">
              <span className="w-2.5 h-2.5 rounded-sm bg-success" />
              <span className="text-sm font-semibold text-foreground">Livres</span>
            </div>
            <span className="text-sm font-bold text-success">{lot.availableSpots}</span>
          </div>
          <div className="flex justify-between items-center bg-card p-2 rounded-lg border border-border">
            <div className="flex gap-2 items-center">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: statusHex }} />
              <span className="text-sm font-semibold text-foreground">Ocupados</span>
            </div>
            <span className="text-sm font-bold" style={{ color: statusHex }}>{occupied}</span>
          </div>
          <p className="text-xs text-muted-foreground text-right mt-1">{lot.totalSpots} lugares disponíveis</p>
        </div>
      </div>

      {lot.zones && lot.zones.length > 0 && (
        <div>
          <h3 className="font-bold text-foreground mb-3 text-sm">Zonas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {lot.zones.map((zone) => {
              const zPct = Math.round(((zone.totalSpots - zone.availableSpots) / zone.totalSpots) * 100);
              const zHex = zone.availableSpots === 0 ? '#ef4444' : zPct > 80 ? '#f59e0b' : '#22c55e';
              return (
                <div key={zone.id} className="p-3 rounded-xl bg-card border border-border flex items-center gap-3">
                  <ZoneTypeBadge type={zone.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-end mb-1">
                      <p className="font-bold text-sm text-foreground truncate">{zone.name}</p>
                      <p className="text-sm font-bold" style={{ color: zHex }}>
                        {zone.availableSpots}<span className="text-xs text-muted-foreground font-medium">/{zone.totalSpots}</span>
                      </p>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${zPct}%`, background: zHex }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
