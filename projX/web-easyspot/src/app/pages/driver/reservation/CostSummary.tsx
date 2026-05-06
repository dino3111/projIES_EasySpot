import type { ParkingLot } from '../../../data/parkingTypes';
import { calcHours, fmtDateTime, fmtDuration, type ReservationStep } from './reservationHelpers';

export function CostSummary({
  lot, arrivalTime, exitTime, cost, spotLabel, step,
}: {
  lot: ParkingLot | null;
  arrivalTime: string;
  exitTime: string;
  cost: number;
  spotLabel: string;
  step: ReservationStep;
}) {
  if (step === 4) return null;
  const hours = calcHours(arrivalTime, exitTime);

  return (
    <div className="card bg-base-200 shadow-lg border border-primary/10">
      <div className="card-body p-4 gap-3">
        <h3 className="font-semibold text-base-content flex items-center gap-2">
          <i className="fa-solid fa-receipt text-primary" />
          Resumo da Reserva
        </h3>

        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <i className="fa-solid fa-square-parking text-primary mt-0.5 w-4 shrink-0" />
            <div>
              <p className="text-base-content/60 text-xs">Parque</p>
              <p className="font-medium text-base-content">
                {lot?.name || <span className="text-base-content/30 italic">Não selecionado</span>}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <i className="fa-solid fa-clock text-primary mt-0.5 w-4 shrink-0" />
            <div>
              <p className="text-base-content/60 text-xs">Chegada</p>
              <p className="font-medium text-base-content">
                {arrivalTime ? fmtDateTime(arrivalTime) : <span className="text-base-content/30 italic">Não definida</span>}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <i className="fa-solid fa-flag-checkered text-primary mt-0.5 w-4 shrink-0" />
            <div>
              <p className="text-base-content/60 text-xs">Saída prevista</p>
              <p className="font-medium text-base-content">
                {exitTime && hours > 0
                  ? <>{fmtDateTime(exitTime)} <span className="text-base-content/50">({fmtDuration(hours)})</span></>
                  : <span className="text-base-content/30 italic">Não definida</span>}
              </p>
            </div>
          </div>

          {step >= 2 && (
            <div className="flex items-start gap-2">
              <i className="fa-solid fa-location-crosshairs text-primary mt-0.5 w-4 shrink-0" />
              <div>
                <p className="text-base-content/60 text-xs">Lugar</p>
                <p className="font-medium text-base-content">
                  {spotLabel || <span className="text-base-content/30 italic">Não escolhido</span>}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="divider my-0" />

        {lot && hours > 0 && (
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-base-content/70">
              <span>Tarifa horária</span>
              <span>€{lot.hourlyRate.toFixed(2)}/h</span>
            </div>
            <div className="flex justify-between text-base-content/70">
              <span>Duração</span>
              <span>× {fmtDuration(hours)}</span>
            </div>
            {lot.hourlyRate * hours > lot.dailyMax && (
              <div className="flex justify-between text-success text-xs">
                <span><i className="fa-solid fa-tag mr-1" />Máx. diário aplicado</span>
                <span>— €{(lot.hourlyRate * hours - lot.dailyMax).toFixed(2)}</span>
              </div>
            )}
            <div className="divider my-0" />
            <div className="flex justify-between font-bold text-lg">
              <span className="text-base-content">Total estimado</span>
              <span className="text-primary">€{cost.toFixed(2)}</span>
            </div>
          </div>
        )}

        {(!lot || hours <= 0) && (
          <p className="text-base-content/40 text-xs italic text-center">
            {!lot ? 'Selecione um parque para ver o custo' : 'Defina a hora de saída para ver o custo'}
          </p>
        )}
      </div>
    </div>
  );
}
