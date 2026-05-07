import type { Vehicle } from '../../../context/ProfileContext';
import { BrandLogo, CHARGER_ICONS } from './vehiclesShared';

export function VehicleCard({
  vehicle, onEdit, onDelete, onSetPrimary,
}: Readonly<{ vehicle: Vehicle; onEdit: () => void; onDelete: () => void; onSetPrimary: () => void }>) {
  return (
    <div className={`rounded-2xl p-4 bg-card border transition-all ${vehicle.isPrimary ? 'border-primary shadow-md shadow-primary/10' : 'border-border'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
            <BrandLogo make={vehicle.make} logoUrl={vehicle.brandLogoUrl} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <h3 className="text-foreground font-extrabold" style={{ fontSize: '1.1rem' }}>{vehicle.plate}</h3>
              {vehicle.isPrimary && (
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold" style={{ fontSize: '0.65rem' }}>PRINCIPAL</span>
              )}
            </div>
            {vehicle.nickname && <p className="text-muted-foreground" style={{ fontSize: '0.8rem' }}>{vehicle.nickname}</p>}
            {vehicle.make && vehicle.model && (
              <p className="text-foreground font-semibold" style={{ fontSize: '0.82rem' }}>
                {vehicle.make} {vehicle.model}{vehicle.year ? ` (${vehicle.year.slice(0, 4)})` : ''}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          {vehicle.isEV && (
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center" title="Veículo Elétrico">
              <i className="fas fa-bolt text-green-500" style={{ fontSize: '0.75rem' }} />
            </div>
          )}
          {vehicle.isAccessible && (
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center" title="Mobilidade Reduzida">
              <i className="fas fa-wheelchair text-blue-500" style={{ fontSize: '0.75rem' }} />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3 text-muted-foreground" style={{ fontSize: '0.78rem' }}>
        {vehicle.fuelType && (
          <div className="flex items-center gap-1.5">
            <i className={`fas ${vehicle.isEV ? 'fa-charging-station' : 'fa-gas-pump'}`} style={{ fontSize: '0.72rem', color: vehicle.isEV ? '#22c55e' : undefined }} />
            <span>{vehicle.fuelType}</span>
          </div>
        )}
        {vehicle.color && (
          <div className="flex items-center gap-1.5">
            <i className="fas fa-palette" style={{ fontSize: '0.72rem' }} />
            <span>{vehicle.color}</span>
          </div>
        )}
        {vehicle.rfid && (
          <div className="flex items-center gap-1.5">
            <i className="fas fa-id-card" style={{ fontSize: '0.72rem', color: '#7357ec' }} />
            <span className="font-mono" style={{ fontSize: '0.72rem' }}>{vehicle.rfid}</span>
          </div>
        )}
      </div>

      {vehicle.isEV && vehicle.chargerTypes && vehicle.chargerTypes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {vehicle.chargerTypes.map((type) => (
            <span key={type} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 font-semibold" style={{ fontSize: '0.7rem' }}>
              <i className={`fas ${CHARGER_ICONS[type] ?? 'fa-plug'}`} style={{ fontSize: '0.65rem' }} />
              {type}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 pt-3 border-t border-border">
        {!vehicle.isPrimary && (
          <button onClick={onSetPrimary} className="flex-1 btn btn-sm btn-outline rounded-full" style={{ fontSize: '0.75rem' }}>
            <i className="fas fa-star mr-1.5" style={{ fontSize: '0.7rem' }} />Definir como Principal
          </button>
        )}
        <button type="button" aria-label="Editar veículo" onClick={onEdit} className="btn btn-sm btn-ghost rounded-full" style={{ fontSize: '0.75rem' }}>
          <i className="fas fa-pen" style={{ fontSize: '0.7rem' }} />
        </button>
        <button type="button" aria-label="Remover veículo" onClick={onDelete} className="btn btn-sm btn-ghost text-error rounded-full" style={{ fontSize: '0.75rem' }}>
          <i className="fas fa-trash" style={{ fontSize: '0.7rem' }} />
        </button>
      </div>
    </div>
  );
}
