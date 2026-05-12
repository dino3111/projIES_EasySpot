import type { ReservationResponse } from '../../../../services/reservationService';
import { formatDateTime } from './reservationsHelpers';

interface CancelReservationDialogProps {
  reservation: ReservationResponse;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function CancelReservationDialog({
  reservation, isSubmitting, onClose, onConfirm,
}: Readonly<CancelReservationDialogProps>) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 pb-[calc(env(safe-area-inset-bottom,0px)+5rem)] md:pb-4">
      <div className="bg-background rounded-3xl w-full max-w-sm shadow-2xl">
        <div className="px-5 pt-5 pb-3 text-center">
          <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-3">
            <i className="fas fa-circle-xmark text-error" style={{ fontSize: '1.5rem' }} />
          </div>
          <h2 className="text-foreground font-extrabold mb-2" style={{ fontSize: '1.2rem' }}>
            Cancelar reserva?
          </h2>
          <p className="text-muted-foreground" style={{ fontSize: '0.875rem' }}>
            Vais cancelar a reserva <strong className="text-foreground font-mono">{reservation.bookingCode}</strong> no parque{' '}
            <strong className="text-foreground">{reservation.parkName}</strong> para{' '}
            <strong className="text-foreground">{formatDateTime(reservation.arrivalDateTime)}</strong>. Esta ação não pode ser revertida.
          </p>
        </div>
        <div className="border-t border-border px-5 py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="btn btn-ghost flex-1 rounded-full"
            style={{ fontSize: '0.875rem' }}
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="btn bg-destructive hover:bg-destructive/90 text-destructive-foreground border-none flex-1 rounded-full"
            style={{ fontSize: '0.875rem' }}
          >
            {isSubmitting ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <>
                <i className="fas fa-trash mr-2" style={{ fontSize: '0.8rem' }} />
                Cancelar reserva
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
