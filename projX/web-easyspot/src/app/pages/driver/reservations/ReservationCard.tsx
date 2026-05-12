import type { ReservationResponse } from '../../../../services/reservationService';
import { STATUS_META, canEditOrCancel, formatDateTime } from './reservationsHelpers';

interface ReservationCardProps {
  reservation: ReservationResponse;
  onEdit: () => void;
  onCancel: () => void;
  isHighlighted?: boolean;
}

export function ReservationCard({ reservation, onEdit, onCancel, isHighlighted = false }: Readonly<ReservationCardProps>) {
  const status = STATUS_META[reservation.status];
  const editable = canEditOrCancel(reservation);

  return (
    <div
      id={`reservation-${reservation.reservationId}`}
      className={`rounded-2xl bg-card border overflow-hidden transition-all hover:border-primary/40 ${
        isHighlighted ? 'border-primary shadow-lg shadow-primary/10 ring-2 ring-primary/30' : 'border-border'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <i className="fas fa-square-parking text-primary" style={{ fontSize: '1.1rem' }} />
            </div>
            <div className="min-w-0">
              <h3 className="text-foreground font-extrabold truncate" style={{ fontSize: '1rem' }}>
                {reservation.parkName}
              </h3>
              <p className="text-muted-foreground truncate" style={{ fontSize: '0.78rem' }}>
                <i className="fas fa-location-dot mr-1" />
                {reservation.parkAddress}
              </p>
            </div>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 flex-shrink-0 ${status.badgeClass}`}
            style={{ fontSize: '0.7rem' }}
          >
            <i className={`fas ${status.icon}`} style={{ fontSize: '0.65rem' }} />
            {status.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-muted-foreground font-bold uppercase mb-0.5" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>
              <i className="fas fa-right-to-bracket mr-1" />Entrada
            </p>
            <p className="text-foreground font-semibold" style={{ fontSize: '0.82rem' }}>
              {formatDateTime(reservation.arrivalDateTime)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground font-bold uppercase mb-0.5" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>
              <i className="fas fa-right-from-bracket mr-1" />Saída
            </p>
            <p className="text-foreground font-semibold" style={{ fontSize: '0.82rem' }}>
              {formatDateTime(reservation.departureDateTime)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-muted-foreground mb-3" style={{ fontSize: '0.78rem' }}>
          <span className="flex items-center gap-1.5">
            <i className="fas fa-hashtag" style={{ fontSize: '0.7rem' }} />
            <span className="font-mono font-semibold">{reservation.bookingCode}</span>
          </span>
          {reservation.spotNumber && (
            <span className="flex items-center gap-1.5">
              <i className="fas fa-car" style={{ fontSize: '0.7rem' }} />
              Lugar {reservation.spotNumber}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <i className="fas fa-coins" style={{ fontSize: '0.7rem' }} />
            <span className="font-semibold text-foreground">
              {Number(reservation.estimatedCost).toFixed(2)} €
            </span>
          </span>
        </div>

        {editable ? (
          <div className="flex items-center gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onEdit}
              className="flex-1 btn btn-sm btn-outline rounded-full"
              style={{ fontSize: '0.75rem' }}
            >
              <i className="fas fa-pen mr-1.5" style={{ fontSize: '0.7rem' }} />
              Editar
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 btn btn-sm rounded-full bg-destructive text-destructive-foreground border-none hover:bg-destructive/90"
              style={{ fontSize: '0.75rem' }}
            >
              <i className="fas fa-circle-xmark mr-1.5" style={{ fontSize: '0.7rem' }} />
              Cancelar
            </button>
          </div>
        ) : (
          <div className="pt-3 border-t border-border">
            <p className="text-muted-foreground" style={{ fontSize: '0.72rem' }}>
              <i className="fas fa-circle-info mr-1.5" />
              Esta reserva já não pode ser editada ou cancelada.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
