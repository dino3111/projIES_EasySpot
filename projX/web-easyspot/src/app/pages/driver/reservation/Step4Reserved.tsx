import { Link } from 'react-router';
import type { ParkingLot, ParkingSpot } from '../../../data/parkingTypes';
import type { Vehicle } from '../../../context/ProfileContext';
import { calcHours, fmtDateTime, fmtDuration, fmtCountdown } from './reservationHelpers';

export function Step4Reserved({
  bookingCode, countdown, lot, spot, vehicle, arrivalTime, exitTime, cost,
  onNewBooking, onNavigate,
}: Readonly<{
  bookingCode: string; countdown: number;
  lot: ParkingLot | null; spot: ParkingSpot | null; vehicle: Vehicle | null;
  arrivalTime: string; exitTime: string; cost: number;
  onNewBooking: () => void; onNavigate: () => void;
}>) {
  const hours = calcHours(arrivalTime, exitTime);
  const pct = (countdown / (30 * 60)) * 100;
  const isExpiring = countdown < 5 * 60;
  const isExpired = countdown === 0;
  let expiryTone = 'text-primary';
  if (isExpired) expiryTone = 'text-error';
  else if (isExpiring) expiryTone = 'text-warning';
  let progressTone = 'bg-primary';
  if (isExpired) progressTone = 'bg-error';
  else if (isExpiring) progressTone = 'bg-warning';
  const hourglassIcon = isExpiring ? 'end' : 'half';

  const reservationTitle = lot?.name ? `Reserva EasySpot - ${lot.name}` : 'Reserva EasySpot';
  const reservationDetails = [
    `Código: ${bookingCode}`,
    lot?.name ? `Parque: ${lot.name}` : null,
    spot?.label ? `Lugar: ${spot.label}` : null,
    `Chegada: ${fmtDateTime(arrivalTime)}`,
    `Saída prevista: ${fmtDateTime(exitTime)}`,
  ].filter(Boolean).join('\n');

  function getReservationSummary() {
    return [
      `${reservationTitle}`,
      lot?.address ? `Morada: ${lot.address}` : null,
      `Código: ${bookingCode}`,
      `Chegada: ${fmtDateTime(arrivalTime)}`,
      `Saída prevista: ${fmtDateTime(exitTime)}`,
      `Custo total: €${cost.toFixed(2)}`,
    ].filter(Boolean).join('\n');
  }

  function escapeHtml(value: string) {
    return value.replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[char] || char));
  }

  function downloadCalendarEvent() {
    const start = new Date(arrivalTime);
    const end = new Date(exitTime);
    const formatIcsDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const escapeIcs = (s: string) =>
      s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
    const location = [lot?.name, lot?.address].filter(Boolean).join(' - ');
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//EasySpot//Reservation//PT',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${bookingCode || crypto.randomUUID()}@easyspot`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(start)}`,
      `DTEND:${formatIcsDate(end)}`,
      `SUMMARY:${reservationTitle}`,
      location ? `LOCATION:${escapeIcs(location)}` : null,
      `DESCRIPTION:${escapeIcs(reservationDetails)}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(Boolean).join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'reserva-easyspot.ics';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function shareReservation() {
    const text = getReservationSummary();
    try {
      if (navigator.share) {
        await navigator.share({ title: reservationTitle, text });
        return;
      }
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt('Copie os detalhes da reserva:', text);
    }
  }

  function printReservation() {
    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1000');
    if (!printWindow) return;

    printWindow.document.write(`
      <!doctype html>
      <html lang="pt">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${escapeHtml(reservationTitle)}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 32px;
              color: #111827;
              background: #fff;
            }
            h1 { margin: 0 0 16px; font-size: 24px; }
            pre {
              white-space: pre-wrap;
              font-size: 14px;
              line-height: 1.6;
              background: #f3f4f6;
              padding: 16px;
              border-radius: 12px;
            }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(reservationTitle)}</h1>
          <pre>${escapeHtml(getReservationSummary())}</pre>
          <script>
            window.onload = () => {
              window.print();
              window.onafterprint = () => window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
        <p className="text-base-content/60 text-sm">
          A reserva está ativa. Guarde os detalhes abaixo para referência rápida.
        </p>
      </div>

      <div className="card w-full max-w-md shadow-md border border-base-300 bg-base-200">
        <div className="card-body p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <i className={`fa-solid fa-hourglass-${hourglassIcon} ${expiryTone}`} />
              <span className="text-sm font-semibold text-base-content">
                {isExpired ? 'Reserva expirada' : 'Validade da reserva'}
              </span>
            </div>
            <span className={`text-2xl font-mono font-bold ${expiryTone}`}>
              {fmtCountdown(countdown)}
            </span>
          </div>
          <div className="w-full bg-base-300 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-1000 ${progressTone}`}
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
              <div><p className="text-base-content/50">Saída prevista</p><p className="font-medium text-base-content">{fmtDateTime(exitTime)}{' '}<span className="text-base-content/50">({fmtDuration(hours)})</span></p></div>
              <div><p className="text-base-content/50">Custo total</p><p className="font-bold text-primary">€{cost.toFixed(2)}</p></div>
              <div><p className="text-base-content/50">Telefone</p><p className="font-medium text-base-content">{lot.phone}</p></div>
              <div className="col-span-2">
                <p className="text-base-content/50">Código da reserva</p>
                <p className="font-mono font-bold text-primary break-all">{bookingCode}</p>
              </div>
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

      <div className="flex flex-col gap-3 w-full max-w-md">
        <Link to="/reservations" className="btn btn-primary rounded-full w-full shadow-lg shadow-primary/30">
          <i className="fa-solid fa-bookmark mr-2" /> Minhas Reservas
        </Link>
        <div className="flex gap-3 w-full">
          <button onClick={onNavigate} className="btn btn-outline btn-primary rounded-full flex-1">
            <i className="fa-solid fa-map-location-dot mr-2" /> Ver no Mapa
          </button>
          <button onClick={onNewBooking} className="btn btn-outline btn-primary rounded-full flex-1">
            <i className="fa-solid fa-plus mr-2" /> Nova Reserva
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        <button type="button" onClick={shareReservation} className="btn btn-ghost btn-xs rounded-full text-base-content/50">
          <i className="fa-solid fa-share-nodes mr-1" /> Partilhar
        </button>
        <button type="button" onClick={downloadCalendarEvent} className="btn btn-ghost btn-xs rounded-full text-base-content/50">
          <i className="fa-solid fa-calendar-plus mr-1" /> Adicionar ao Calendário
        </button>
        <button type="button" onClick={printReservation} className="btn btn-ghost btn-xs rounded-full text-base-content/50">
          <i className="fa-solid fa-download mr-1" /> Guardar PDF
        </button>
      </div>
    </div>
  );
}
