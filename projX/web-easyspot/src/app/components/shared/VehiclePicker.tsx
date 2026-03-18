import { getBrandLogoUrl } from '../../utils/brandLogo';
import type { Vehicle } from '../../context/ProfileContext';

interface VehiclePickerProps {
  vehicles: Vehicle[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  label?: string;
  allLabel?: string;
  className?: string;
}

function vehicleLabel(v: Vehicle) {
  const name = v.nickname || [v.make, v.model].filter(Boolean).join(' ') || v.plate;
  const badges = [v.isEV ? '⚡' : '', v.isAccessible ? '♿' : ''].filter(Boolean).join(' ');
  return badges ? `${name} ${badges}` : name;
}

export function VehiclePicker({
  vehicles,
  selectedId,
  onSelect,
  label = 'Veículo',
  allLabel = 'Todos os veículos',
  className = '',
}: VehiclePickerProps) {
  if (vehicles.length === 0) return null;

  const selected = vehicles.find((v) => v.id === selectedId) ?? null;
  const logoUrl = selected ? getBrandLogoUrl(selected.make) : null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-muted-foreground font-semibold flex-shrink-0" style={{ fontSize: '0.78rem' }}>
        <i className="fas fa-car mr-1 text-primary/70" />
        {label}
      </span>
      <div className="relative flex items-center">
        {logoUrl && (
          <img
            src={logoUrl}
            alt={selected?.make}
            className="absolute left-2.5 pointer-events-none z-10"
            style={{ width: 16, height: 16, objectFit: 'contain' }}
            onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
          />
        )}
        <select
          value={selectedId ?? ''}
          onChange={(e) => onSelect(e.target.value || null)}
          className={`rounded-xl border border-border bg-card text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all appearance-none pr-7 ${logoUrl ? 'pl-8' : 'pl-3'}`}
          style={{ fontSize: '0.82rem', paddingTop: '0.4rem', paddingBottom: '0.4rem' }}
          aria-label={`Selecionar ${label.toLowerCase()}`}
        >
          <option value="">{allLabel}</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {vehicleLabel(v)}
            </option>
          ))}
        </select>
        <i
          className="fas fa-chevron-down text-muted-foreground pointer-events-none absolute right-2.5"
          style={{ fontSize: '0.6rem' }}
        />
      </div>
    </div>
  );
}
