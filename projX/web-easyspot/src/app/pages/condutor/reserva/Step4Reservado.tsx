import { useRef } from 'react';
import type { ParkingLot, ParkingSpot } from '../../../data/parkingData';
import type { Vehicle } from '../../../context/ProfileContext';
import { calcHours, fmtDateTime, fmtDuration, fmtCountdown } from './reservaHelpers';

export function Step4Reservado({
  bookingCode, countdown, lot, spot, vehicle, arrivalTime, exitTime, cost,
  onNewBooking, onNavigate,
}: {
  bookingCode: string; countdown: number;
  lot: ParkingLot | null; spot: ParkingSpot | null; vehicle: Vehicle | null;
  arrivalTime: string; exitTime: string; cost: number;
  onNewBooking: () => void; onNavigate: () => void;
}) {
  const codeRef = useRef<HTMLDivElement>(null);
  const hours = calcHours(arrivalTime, exitTime);
  const pct = (countdown / (30 * 60)) * 100;
  const isExpiring = countdown < 5 * 60;
  const isExpired = countdown === 0;

  function copyCode() {
    navigator.clipboard.writeText(bookingCode).catch(() => {});
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-success/20 flex items-center justify-center animate-bounce">
          <div className="w-16 h-16 rounded-full bg-success flex items-center justify-center">
            <i className="fa-solid fa-check text-success-content text-3xl" />
          </div>
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-base-content mb-1">Reserva Confirmada!</h2>
        <p className="text-base-content/60 text-sm">O seu lugar está garantido. Apresente o código ou dirija-se ao parque.</p>
      </div>

      <div className="card bg-base-200 shadow-xl w-full max-w-md border-2 border-primary/20">
        <div className="card-body p-6 text-center">
          <p className="text-xs text-base-content/50 uppercase tracking-widest mb-2">Código de Reserva</p>
          <div
            ref={codeRef}
            className="text-3xl font-bold font-mono tracking-[0.15em] text-primary bg-primary/10 rounded-2xl py-4 px-6 select-all"
            aria-label={`Código de reserva: ${bookingCode}`}
          >
            {bookingCode}
          </div>
          <button
            onClick={copyCode}
            className="btn btn-xs btn-ghost rounded-full mt-2 text-base-content/60"
            aria-label="Copiar código de reserva"
          >
            <i className="fa-solid fa-copy mr-1" /> Copiar código
          </button>
          <div className="mt-3 w-24 h-24 mx-auto rounded-xl bg-base-300 flex flex-col items-center justify-center border-2 border-dashed border-base-content/20">
            <i className="fa-solid fa-qrcode text-base-content/30 text-3xl" />
            <p className="text-[9px] text-base-content/30 mt-1">QR Code</p>
          </div>
        </div>
      </div>

      <div className="card w-full max-w-md shadow-md border border-base-300 bg-base-200">
        <div className="card-body p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <i className={`fa-solid fa-hourglass-${isExpiring ? 'end' : 'half'} ${isExpired ? 'text-error' : isExpiring ? 'text-warning' : 'text-primary'}`} />
              <span className="text-sm font-semibold text-base-content">
                {isExpired ? 'Reserva expirada' : 'Validade da reserva'}
              </span>
            </div>
            <span className={`text-2xl font-mono font-bold ${isExpired ? 'text-error' : isExpiring ? 'text-warning' : 'text-primary'}`}>
              {fmtCountdown(countdown)}
            </span>
          </div>
          <div className="w-full bg-base-300 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-1000 ${isExpired ? 'bg-error' : isExpiring ? 'bg-warning' : 'bg-primary'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {isExpiring && !isExpired && (
            <p className="text-warning text-xs mt-1.5 flex items-center gap-1">
              <i className="fa-solid fa-triangle-exclamation" />
              A reserva expira em breve! Dirija-se ao parque.
            </p>
          )}
          {isExpired && (
            <p className="text-error text-xs mt-1.5 flex items-center gap-1">
              <i className="fa-solid fa-circle-xmark" />
              A reserva expirou. Pode efetuar uma nova reserva.
            </p>
          )}
        </div>
      </div>

      {lot && (
        <div className="card w-full max-w-md bg-base-200 shadow-md border border-base-300">
          <div className="card-body p-4">
            <h3 className="font-semibold text-base-content text-sm mb-2">
              <i className="fa-solid fa-circle-info text-primary mr-2" />
              Detalhes da Reserva
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><p className="text-base-content/50">Parque</p><p className="font-medium text-base-content">{lot.name}</p></div>
              <div><p className="text-base-content/50">Lugar</p><p className="font-medium text-base-content">{spot?.label || '—'}</p></div>
              <div><p className="text-base-content/50">Chegada</p><p className="font-medium text-base-content">{fmtDateTime(arrivalTime)}</p></div>
              <div><p className="text-base-content/50">Saída prevista</p><p className="font-medium text-base-content">{fmtDateTime(exitTime)} <span className="text-base-content/50">({fmtDuration(hours)})</span></p></div>
              <div><p className="text-base-content/50">Custo total</p><p className="font-bold text-primary">€{cost.toFixed(2)}</p></div>
              <div><p className="text-base-content/50">Telefone</p><p className="font-medium text-base-content">{lot.phone}</p></div>
              {vehicle && (
                <div className="col-span-2">
                  <p className="text-base-content/50">Veículo</p>
                  <p className="font-medium text-base-content font-mono">{vehicle.plate}{vehicle.make ? ` · ${vehicle.make} ${vehicle.model ?? ''}` : ''}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
        <button onClick={onNavigate} className="btn btn-primary rounded-full flex-1 shadow-lg shadow-primary/30">
          <i className="fa-solid fa-map-location-dot mr-2" /> Ver no Mapa
        </button>
        <button onClick={onNewBooking} className="btn btn-outline btn-primary rounded-full flex-1">
          <i className="fa-solid fa-plus mr-2" /> Nova Reserva
        </button>
      </div>

      <div className="flex gap-4">
        <button className="btn btn-ghost btn-xs rounded-full text-base-content/50">
          <i className="fa-solid fa-share-nodes mr-1" /> Partilhar
        </button>
        <button className="btn btn-ghost btn-xs rounded-full text-base-content/50">
          <i className="fa-solid fa-calendar-plus mr-1" /> Adicionar ao Calendário
        </button>
        <button className="btn btn-ghost btn-xs rounded-full text-base-content/50">
          <i className="fa-solid fa-download mr-1" /> Guardar PDF
        </button>
      </div>
    </div>
  );
}
