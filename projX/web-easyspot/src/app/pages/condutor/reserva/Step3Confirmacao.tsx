import type { ParkingLot, ParkingSpot } from '../../../data/parkingData';
import type { Vehicle } from '../../../context/ProfileContext';
import { calcHours, fmtDateTime, fmtDuration } from './reservaHelpers';

export function Step3Confirmacao({
  lot, floor, spot, arrivalTime, exitTime, cost,
  vehicle, agreeTerms, setAgreeTerms,
  onConfirm, onBack,
}: {
  lot: ParkingLot; floor: string; spot: ParkingSpot | null;
  arrivalTime: string; exitTime: string; cost: number;
  vehicle: Vehicle | null;
  agreeTerms: boolean; setAgreeTerms: (b: boolean) => void;
  onConfirm: () => void; onBack: () => void;
}) {
  const hours = calcHours(arrivalTime, exitTime);

  return (
    <div className="space-y-4">
      <div className="card bg-base-200 shadow-md">
        <div className="card-body p-4">
          <h2 className="font-semibold text-base-content text-lg mb-3">
            <i className="fa-solid fa-list-check text-primary mr-2" />
            Resumo da Reserva
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { icon: 'fa-square-parking',   label: 'Parque',  value: lot.name },
              { icon: 'fa-location-dot',      label: 'Morada',  value: lot.address },
              { icon: 'fa-calendar-day',      label: 'Chegada', value: fmtDateTime(arrivalTime) },
              { icon: 'fa-flag-checkered',    label: 'Saída',   value: `${fmtDateTime(exitTime)} (${fmtDuration(hours)})` },
              { icon: 'fa-layer-group',       label: 'Piso',    value: floor },
              { icon: 'fa-car',               label: 'Lugar',   value: spot?.label || '—' },
              ...(vehicle ? [{ icon: 'fa-id-card', label: 'Veículo', value: `${vehicle.plate}${vehicle.make ? ` · ${vehicle.make}` : ''}` }] : []),
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex items-start gap-2">
                <i className={`fa-solid ${icon} text-primary mt-0.5 w-4 shrink-0`} />
                <div>
                  <p className="text-base-content/50 text-xs">{label}</p>
                  <p className="font-medium text-base-content">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card bg-base-200 shadow-md">
        <div className="card-body p-4">
          <h2 className="font-semibold text-base-content text-lg mb-3">
            <i className="fa-solid fa-euro-sign text-primary mr-2" />
            Custo Total
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-base-content/70">
              <span>Tarifa horária</span>
              <span>€{lot.hourlyRate.toFixed(2)}/h</span>
            </div>
            <div className="flex justify-between text-base-content/70">
              <span>Duração ({fmtDuration(hours)})</span>
              <span>€{(lot.hourlyRate * hours).toFixed(2)}</span>
            </div>
            {lot.hourlyRate * hours > lot.dailyMax && (
              <div className="flex justify-between text-success text-xs">
                <span><i className="fa-solid fa-tag mr-1" />Desconto máximo diário</span>
                <span>−€{(lot.hourlyRate * hours - lot.dailyMax).toFixed(2)}</span>
              </div>
            )}
            <div className="divider my-1" />
            <div className="flex justify-between font-bold text-xl">
              <span className="text-base-content">Total</span>
              <span className="text-primary">€{cost.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="alert bg-primary/10 border border-primary/20 rounded-2xl p-4">
        <i className="fa-solid fa-shield-halved text-primary text-2xl" />
        <div>
          <p className="font-semibold text-base-content text-sm mb-1">Identificação Automática</p>
          <p className="text-base-content/70 text-xs">
            O seu veículo será identificado automaticamente na entrada através do sistema associado ao seu perfil.
            O pagamento será processado pelo método de pagamento definido nas suas definições.
          </p>
        </div>
      </div>

      <div className="card bg-base-200 shadow-md">
        <div className="card-body p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="checkbox checkbox-primary mt-0.5 shrink-0"
              checked={agreeTerms}
              onChange={e => setAgreeTerms(e.target.checked)}
              aria-label="Aceitar termos e condições"
            />
            <span className="text-sm text-base-content/80">
              Aceito os <span className="text-primary underline cursor-pointer">termos e condições</span> da reserva e autorizo a cobrança automática. A reserva é válida por <strong>30 minutos</strong> após a hora marcada.
            </span>
          </label>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="btn btn-ghost rounded-full flex-1 border border-base-300">
          <i className="fa-solid fa-arrow-left mr-2" /> Voltar
        </button>
        <button
          onClick={onConfirm}
          disabled={!agreeTerms}
          className="btn btn-primary rounded-full flex-1 shadow-lg shadow-primary/30 disabled:opacity-40"
          aria-label="Confirmar e reservar lugar"
        >
          <i className="fa-solid fa-lock mr-2" />
          Confirmar Reserva
        </button>
      </div>
    </div>
  );
}
