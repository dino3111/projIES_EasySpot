import type { ParkingLot, ParkingSpot } from '../../../data/parkingTypes';
import type { Vehicle } from '../../../context/ProfileContext';
import type { PaymentMethodSummaryResponse } from '../../../../services/apiService';
import { calcHours, fmtDateTime, fmtDuration } from './reservationHelpers';

export function Step3Confirmation({
  lot, floor, spot, arrivalTime, exitTime, cost,
  vehicle, agreeTerms, setAgreeTerms,
  onConfirm, onBack, onAddPaymentMethod, isSubmitting = false, paymentConfigured = null, paymentMethods = [],
}: Readonly<{
  lot: ParkingLot; floor: string; spot: ParkingSpot | null;
  arrivalTime: string; exitTime: string; cost: number;
  vehicle: Vehicle | null;
  agreeTerms: boolean; setAgreeTerms: (b: boolean) => void;
  onConfirm: () => void; onBack: () => void;
  onAddPaymentMethod?: () => void;
  isSubmitting?: boolean;
  paymentConfigured?: boolean | null;
  paymentMethods?: PaymentMethodSummaryResponse[];
}>) {
  const hours = calcHours(arrivalTime, exitTime);
  let vehicleLabel: string | null = null;
  if (vehicle) {
    const makeSuffix = vehicle.make ? ` · ${vehicle.make}` : '';
    vehicleLabel = `${vehicle.plate}${makeSuffix}`;
  }
  const defaultMethod = paymentMethods.find((m) => m.isDefault) ?? paymentMethods[0] ?? null;

  return (
    <div className="space-y-4">
      <div className="card bg-base-200 shadow-md">
        <div className="card-body p-4">
          <h2 className="font-semibold text-base-content text-lg mb-3">
            <i className="fa-solid fa-list-check text-primary mr-2" />
            {' Resumo da Reserva'}
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { icon: 'fa-square-parking',   label: 'Parque',  value: lot.name },
              { icon: 'fa-location-dot',      label: 'Morada',  value: lot.address },
              { icon: 'fa-calendar-day',      label: 'Chegada', value: fmtDateTime(arrivalTime) },
              { icon: 'fa-flag-checkered',    label: 'Saída',   value: `${fmtDateTime(exitTime)} (${fmtDuration(hours)})` },
              { icon: 'fa-layer-group',       label: 'Piso',    value: floor },
              { icon: 'fa-car',               label: 'Lugar',   value: spot?.label || '—' },
              ...(vehicleLabel ? [{ icon: 'fa-id-card', label: 'Veículo', value: vehicleLabel }] : []),
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
          {vehicle?.imageUrl && (
            <img
              src={vehicle.imageUrl}
              alt={vehicleLabel ?? 'Veículo'}
              className="mt-3 w-full h-24 object-cover rounded-xl border border-base-300"
            />
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card bg-base-200 shadow-md">
          <div className="card-body p-4">
            <h2 className="font-semibold text-base-content text-lg mb-3">
              <i className="fa-solid fa-credit-card text-primary mr-2" />
              {' Pagamento'}
            </h2>
            {defaultMethod ? (
              <div className="rounded-xl border border-success/30 bg-success/10 p-3 text-sm">
                <p className="font-semibold text-base-content">
                  {defaultMethod.brand ? defaultMethod.brand.toUpperCase() : 'Cartão'}
                  {' •••• '}
                  {defaultMethod.last4 ?? '----'}
                </p>
                <p className="text-base-content/70 text-xs mt-1">
                  Expira em {String(defaultMethod.expMonth ?? '').padStart(2, '0')}/{defaultMethod.expYear ?? '----'}
                  {defaultMethod.isDefault ? ' · Método principal' : ''}
                </p>
              </div>
            ) : (
              <p className="text-base-content/70 text-xs">
                Não existe método de pagamento carregado nesta sessão.
              </p>
            )}
            {paymentConfigured === false && (
              <p className="mt-2 text-warning text-xs font-semibold">
                O Stripe ainda não tem um método de pagamento guardado para a caução.
              </p>
            )}
          </div>
        </div>

        <div className="card bg-base-200 shadow-md">
          <div className="card-body p-4">
            <h2 className="font-semibold text-base-content text-lg mb-3">
              <i className="fa-solid fa-euro-sign text-primary mr-2" />
              {' Resumo de Cobrança'}
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-base-content/70">
                <span>Tarifa horária</span>
                <span>
                  {'€'}
                  {lot.hourlyRate.toFixed(2)}
                  {'/h'}
                </span>
              </div>
              <div className="flex justify-between text-base-content/70">
                <span>
                  {'Duração ('}
                  {fmtDuration(hours)}
                  {')'}
                </span>
                <span>
                  {'€'}
                  {(lot.hourlyRate * hours).toFixed(2)}
                </span>
              </div>
              {lot.hourlyRate * hours > lot.dailyMax && (
                <div className="flex justify-between text-success text-xs">
                  <span>
                    <i className="fa-solid fa-tag mr-1" />
                    {' Desconto máximo diário'}
                  </span>
                  <span>
                    {'−€'}
                    {(lot.hourlyRate * hours - lot.dailyMax).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="divider my-1" />
              <div className="flex justify-between font-bold text-xl">
                <span className="text-base-content">Total</span>
                <span className="text-primary">
                  {'€'}
                  {cost.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {onAddPaymentMethod ? (
        <div className="card bg-base-200 shadow-md">
          <div className="card-body p-4">
            <button type="button" className="btn btn-outline btn-primary btn-sm w-fit" onClick={onAddPaymentMethod}>
              <i className="fa-solid fa-credit-card mr-2" />
              Adicionar método de pagamento
            </button>
          </div>
        </div>
      ) : null}

      <div className="alert bg-primary/10 border border-primary/20 rounded-2xl p-4">
        <i className="fa-solid fa-shield-halved text-primary text-2xl" />
        <div>
          <p className="font-semibold text-base-content text-sm mb-1">Identificação Automática</p>
          <p className="text-base-content/70 text-xs">
            O seu veículo será identificado automaticamente na entrada através do sistema associado ao seu perfil.
            O pagamento será processado pelo método de pagamento definido nas suas definições.
          </p>
          {paymentConfigured === null && (
            <p className="mt-2 text-base-content/50 text-xs">
              Verificamos o estado do pagamento antes de confirmar a reserva.
            </p>
          )}
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
              {'Aceito os '}
              <span className="text-primary underline cursor-pointer">termos e condições</span>
              {' da reserva e autorizo a cobrança automática. A reserva é válida por '}
              <strong>30 minutos</strong>
              {' após a hora marcada.'}
            </span>
          </label>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="btn btn-ghost rounded-full flex-1 border border-base-300">
          <i className="fa-solid fa-arrow-left mr-2" />
          {' Voltar'}
        </button>
        <button
          onClick={onConfirm}
          disabled={!agreeTerms || isSubmitting || paymentConfigured === false}
          className="btn btn-primary rounded-full flex-1 shadow-lg shadow-primary/30 disabled:opacity-40"
        >
          {isSubmitting
            ? <span className="loading loading-spinner loading-sm" />
            : <i className="fa-solid fa-lock mr-2" />}
          {isSubmitting ? ' A reservar…' : ' Confirmar Reserva'}
        </button>
      </div>
    </div>
  );
}
