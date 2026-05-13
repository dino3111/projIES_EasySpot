import { useState } from 'react';
import { getBrandLogoUrl } from '../../utils/brandLogo';
import type { Vehicle } from '../../context/ProfileContext';

interface VehiclePickerProps {
  readonly vehicles: readonly Vehicle[];
  readonly selectedId: string | null;
  readonly onSelect: (id: string | null) => void;
  readonly label?: string;
  readonly allLabel?: string;
  readonly className?: string;
}

function vehicleLabel(v: Vehicle) {
  return v.nickname || [v.make, v.model].filter(Boolean).join(' ') || v.plate;
}

function VehicleOption({
  vehicle,
  selected,
  onSelect,
}: Readonly<{ vehicle: Vehicle; selected: boolean; onSelect: () => void }>) {
  const logoUrl = vehicle.brandLogoUrl ?? getBrandLogoUrl(vehicle.make);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-xl border-2 transition-all overflow-hidden ${
        selected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'
      }`}
    >
      {vehicle.imageUrl && (
        <img
          src={vehicle.imageUrl}
          alt={vehicle.plate}
          className="w-full h-20 object-cover"
        />
      )}
      <div className="flex items-center gap-2.5 px-3 py-2">
        {logoUrl && (
          <img
            src={logoUrl}
            alt={vehicle.make || ''}
            className="w-6 h-6 object-contain flex-shrink-0"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-mono font-bold text-foreground truncate" style={{ fontSize: '0.82rem' }}>
            {vehicle.plate}
          </p>
          {(vehicle.make || vehicle.model) && (
            <p className="text-muted-foreground truncate" style={{ fontSize: '0.7rem' }}>
              {[vehicle.make, vehicle.model].filter(Boolean).join(' ')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {vehicle.isEV && <span className="text-green-500 text-xs">⚡</span>}
          {vehicle.isAccessible && <span className="text-blue-500 text-xs">♿</span>}
          {selected && <i className="fas fa-circle-check text-primary" style={{ fontSize: '0.8rem' }} />}
        </div>
      </div>
    </button>
  );
}

export function VehiclePicker({
  vehicles,
  selectedId,
  onSelect,
  label = 'Veículo',
  allLabel = 'Todos os veículos',
  className = '',
}: VehiclePickerProps) {
  const [open, setOpen] = useState(false);

  if (vehicles.length === 0) return null;

  const selected = vehicles.find((v) => v.id === selectedId) ?? null;
  const logoUrl = selected ? (selected.brandLogoUrl ?? getBrandLogoUrl(selected.make)) : null;

  const handleSelect = (id: string | null) => {
    onSelect(id);
    setOpen(false);
  };

  return (
    <div className={className}>
      {label && (
        <span className="text-muted-foreground font-semibold mr-2 flex-shrink-0" style={{ fontSize: '0.78rem' }}>
          <i className="fas fa-car mr-1 text-primary/70" />
          {label}
        </span>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-foreground font-semibold hover:border-primary/50 transition-all"
        style={{ fontSize: '0.82rem' }}
        aria-label={`Selecionar ${label.toLowerCase()}`}
      >
        {selected ? (
          <>
            {logoUrl && (
              <img
                src={logoUrl}
                alt={selected.make || ''}
                className="w-4 h-4 object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )}
            {selected.imageUrl && (
              <img
                src={selected.imageUrl}
                alt={selected.plate}
                className="w-8 h-5 object-cover rounded"
              />
            )}
            <span>{vehicleLabel(selected)}</span>
          </>
        ) : (
          <span className="text-muted-foreground">{allLabel}</span>
        )}
        <i className="fas fa-chevron-down text-muted-foreground" style={{ fontSize: '0.6rem' }} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 pt-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:p-4">
          <div className="relative z-[10000] bg-background rounded-3xl w-full max-w-sm shadow-2xl max-h-[calc(100vh-8rem-env(safe-area-inset-bottom))] sm:max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-foreground font-extrabold" style={{ fontSize: '1rem' }}>
                {label || 'Veículo'}
              </h2>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              >
                <i className="fas fa-times text-muted-foreground" style={{ fontSize: '0.85rem' }} />
              </button>
            </div>
            <div className="px-4 py-4 space-y-2 overflow-y-auto">
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className={`w-full text-left rounded-xl border-2 px-4 py-2.5 transition-all ${
                  selectedId ? 'border-border bg-card hover:border-primary/40' : 'border-primary bg-primary/5'
                }`}
              >
                <span className="text-muted-foreground font-medium" style={{ fontSize: '0.82rem' }}>
                  {allLabel}
                </span>
              </button>
              {vehicles.map((v) => (
                <VehicleOption
                  key={v.id}
                  vehicle={v}
                  selected={v.id === selectedId}
                  onSelect={() => handleSelect(v.id)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
