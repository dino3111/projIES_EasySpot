import type { ParkingLot } from '../../../data/parkingTypes';

export function TabTariffs({ lot }: { lot: ParkingLot }) {
  return (
    <div className="animate-in fade-in duration-200">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center p-3 rounded-xl bg-primary text-primary-foreground shadow-sm">
            <div>
              <p className="font-bold text-sm">Por Hora</p>
              <p className="opacity-80 text-xs">Fração de 15 min</p>
            </div>
            <p className="font-black text-xl">€{lot.hourlyRate.toFixed(2)}</p>
          </div>
          <div className="flex justify-between items-center p-3 rounded-xl bg-card border border-border">
            <div>
              <p className="font-bold text-sm text-foreground">Máx. Diário</p>
              <p className="text-muted-foreground text-xs">Limite 24h</p>
            </div>
            <p className="font-bold text-sm text-foreground">€{lot.dailyMax.toFixed(2)}</p>
          </div>
          <div className="flex justify-between items-center p-3 rounded-xl bg-card border border-border">
            <div>
              <p className="font-bold text-sm text-foreground">Passe Mensal</p>
              <p className="text-muted-foreground text-xs">Acesso 24/7</p>
            </div>
            <p className="font-bold text-sm text-foreground">€{lot.monthlyRate.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
