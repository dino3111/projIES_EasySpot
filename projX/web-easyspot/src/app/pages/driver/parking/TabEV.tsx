import type { ParkingLot } from '../../../data/parkingTypes';
import type { Vehicle } from '../../../context/ProfileContext';

export function TabEV({ lot, myVehicle }: Readonly<{ lot: ParkingLot; myVehicle: Vehicle | null }>) {
  if (!lot.evChargers) return null;

  return (
    <div className="animate-in fade-in duration-200">
      {myVehicle?.isEV && (
        <div className="mb-3 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-primary/6 border border-primary/20">
          <i className="fas fa-plug text-primary mt-0.5 flex-shrink-0" style={{ fontSize: '0.8rem' }} />
          <div>
            <p className="text-foreground font-semibold" style={{ fontSize: '0.78rem' }}>
              Compatibilidade
            </p>
            {myVehicle.chargerTypes && myVehicle.chargerTypes.length > 0 ? (
              <p className="text-muted-foreground" style={{ fontSize: '0.72rem' }}>
                {myVehicle.chargerTypes.join(' · ')}
              </p>
            ) : (
              <p className="text-muted-foreground" style={{ fontSize: '0.72rem' }}>
                O seu veículo é elétrico e pode usar os carregadores disponíveis.
              </p>
            )}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {lot.evChargers.map((c) => {
          const compatible = myVehicle?.chargerTypes?.includes(c.type) ?? null;
          const compatibilityClass =
            compatible === true
              ? 'border-success/40'
              : (compatible === false ? 'border-border opacity-60' : 'border-border');
          return (
            <div
              key={c.id}
              className={`p-3 rounded-xl border bg-card flex gap-3 items-center ${compatibilityClass}`}
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm flex-shrink-0">
                <i className={`fas ${c.type === 'Tesla Supercharger' ? 'fa-bolt' : 'fa-plug'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-bold text-sm text-foreground truncate">{c.type}</p>
                    {compatible === true && (
                      <span className="text-success text-[10px] font-bold"><i className="fas fa-check-circle" /> Compatível</span>
                    )}
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${c.available ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
                    {c.available ? 'Livre' : 'Ocupado'}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs font-medium">{c.speedKW} kW • {c.speed}</p>
                <p className="text-primary font-bold text-sm mt-1">€{c.price.toFixed(2)}<span className="opacity-60 font-normal">/kWh</span></p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
