import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import {
  cancelReservation,
  listReservations,
  updateReservation,
  type ReservationResponse,
} from '../../../../services/reservationService';
import { getAccessToken } from '../../../services/authToken';
import { ReservationCard } from './ReservationCard';
import { EditReservationModal, type EditReservationFormValues } from './EditReservationModal';
import { CancelReservationDialog } from './CancelReservationDialog';
import { filterReservations, type ReservationFilter } from './reservationsHelpers';

const FILTERS: { key: ReservationFilter; label: string; icon: string }[] = [
  { key: 'upcoming', label: 'Próximas', icon: 'fa-calendar-day' },
  { key: 'past',     label: 'Histórico', icon: 'fa-clock-rotate-left' },
  { key: 'all',      label: 'Todas',    icon: 'fa-layer-group' },
];

function paymentAdjustmentErrorMessage(paymentStatus: string | null, kind: 'charge' | 'refund'): string {
  const normalized = paymentStatus?.toLowerCase() ?? '';
  if (kind === 'charge') {
    if (normalized.includes('card_declined')) {
      return 'Reserva atualizada, mas o cartão guardado foi recusado. Atualiza o método de pagamento Stripe e tenta novamente.';
    }
    if (normalized.includes('insufficient_funds')) {
      return 'Reserva atualizada, mas o cartão guardado não tem saldo suficiente para cobrar a diferença.';
    }
    if (normalized.includes('expired_card')) {
      return 'Reserva atualizada, mas o cartão guardado expirou. Atualiza o método de pagamento Stripe.';
    }
    return 'Reserva atualizada, mas a cobrança da diferença falhou. Tenta novamente dentro de instantes ou atualiza o teu método de pagamento.';
  }

  return 'Reserva atualizada, mas o reembolso falhou. Tenta novamente dentro de instantes ou contacta o suporte.';
}

export function MyReservationsPage() {
  const [reservations, setReservations] = useState<ReservationResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReservationFilter>('upcoming');

  const [editing, setEditing] = useState<ReservationResponse | null>(null);
  const [cancelling, setCancelling] = useState<ReservationResponse | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);

  const refresh = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setLoadError('É necessário iniciar sessão para ver as reservas.');
      setReservations([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const list = await listReservations(token);
      const sorted = [...list].sort((a, b) =>
        new Date(b.arrivalDateTime).getTime() - new Date(a.arrivalDateTime).getTime()
      );
      setReservations(sorted);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Não foi possível carregar as reservas.');
      setReservations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const visible = useMemo(() => filterReservations(reservations, filter), [reservations, filter]);

  const handleSaveEdit = async (values: EditReservationFormValues) => {
    if (!editing) return;
    const token = getAccessToken();
    if (!token) {
      setActionError('Sessão expirada. Inicie sessão novamente.');
      return;
    }
    setActionPending(true);
    setActionError(null);
    try {
      const result = await updateReservation(
        editing.reservationId,
        {
          parkId: editing.parkId,
          vehicleId: editing.vehicleId ?? '',
          arrivalDateTime: values.arrivalDateTime,
          departureDateTime: values.departureDateTime,
          selectedSpotId: values.selectedSpotId,
        },
        token,
      );
      const updated = result.reservation;
      setReservations((prev) => prev.map((r) => (r.reservationId === updated.reservationId ? updated : r)));
      const delta = Number(result.costDelta);
      if (result.paymentAdjustmentKind === 'CHARGED') {
        toast.success(`Reserva atualizada · cobrados ${delta.toFixed(2)} €`);
      } else if (result.paymentAdjustmentKind === 'REFUNDED') {
        toast.success(`Reserva atualizada · reembolsados ${Math.abs(delta).toFixed(2)} €`);
      } else if (result.paymentAdjustmentKind === 'CHARGE_FAILED') {
        toast.error(paymentAdjustmentErrorMessage(result.paymentStatus, 'charge'));
      } else if (result.paymentAdjustmentKind === 'REFUND_FAILED') {
        toast.error(paymentAdjustmentErrorMessage(result.paymentStatus, 'refund'));
      } else {
        toast.success('Reserva atualizada');
      }
      setEditing(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Falha ao atualizar a reserva.');
    } finally {
      setActionPending(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelling) return;
    const token = getAccessToken();
    if (!token) {
      toast.error('Sessão expirada. Inicie sessão novamente.');
      return;
    }
    setActionPending(true);
    try {
      const cancelled = await cancelReservation(cancelling.reservationId, token);
      setReservations((prev) => prev.map((r) => (r.reservationId === cancelled.reservationId ? cancelled : r)));
      toast.success('Reserva cancelada');
      setCancelling(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao cancelar a reserva.');
    } finally {
      setActionPending(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 pb-24">
      <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-foreground flex items-center gap-2" style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.2 }}>
            <i className="fas fa-bookmark text-primary" />
            As Minhas Reservas
          </h1>
          <p className="text-muted-foreground mt-1" style={{ fontSize: '0.875rem' }}>
            Consulta, edita ou cancela as tuas reservas.
          </p>
        </div>
        <Link
          to="/reservation"
          className="btn btn-primary rounded-full px-5"
          style={{ fontSize: '0.85rem' }}
        >
          <i className="fas fa-plus mr-2" style={{ fontSize: '0.8rem' }} />
          Nova reserva
        </Link>
      </div>

      <div className="flex items-center gap-2 mb-4 overflow-x-auto" role="tablist" aria-label="Filtrar reservas">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full border transition-all flex-shrink-0 ${
                active
                  ? 'bg-primary/15 text-primary border-primary/40 font-bold'
                  : 'bg-card text-muted-foreground border-border hover:border-primary/40'
              }`}
              style={{ fontSize: '0.78rem' }}
            >
              <i className={`fas ${f.icon}`} style={{ fontSize: '0.72rem' }} />
              {f.label}
            </button>
          );
        })}
      </div>

      {isLoading && (
        <div className="text-center py-12">
          <span className="loading loading-spinner text-primary" />
          <p className="text-muted-foreground mt-3" style={{ fontSize: '0.85rem' }}>A carregar reservas…</p>
        </div>
      )}

      {!isLoading && loadError && (
        <div className="alert alert-error rounded-2xl mb-4" role="alert">
          <i className="fas fa-circle-exclamation" />
          <span style={{ fontSize: '0.85rem' }}>{loadError}</span>
          <button type="button" onClick={() => void refresh()} className="btn btn-ghost btn-xs ml-auto">
            <i className="fas fa-rotate-right mr-1" />Tentar novamente
          </button>
        </div>
      )}

      {!isLoading && !loadError && visible.length === 0 && (
        <div className="text-center py-12">
          <div className="w-20 h-20 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
            <i className="fas fa-calendar-xmark text-muted-foreground" style={{ fontSize: '2rem' }} />
          </div>
          <p className="text-foreground font-bold mb-1" style={{ fontSize: '1rem' }}>Sem reservas para mostrar</p>
          <p className="text-muted-foreground mb-5" style={{ fontSize: '0.85rem' }}>
            {filter === 'upcoming'
              ? 'Ainda não tens reservas futuras agendadas.'
              : 'Não há reservas para este filtro.'}
          </p>
          <Link to="/reservation" className="btn btn-primary rounded-full px-6" style={{ fontSize: '0.875rem' }}>
            <i className="fas fa-plus mr-2" style={{ fontSize: '0.85rem' }} />
            Reservar agora
          </Link>
        </div>
      )}

      {!isLoading && !loadError && visible.length > 0 && (
        <div className="space-y-3">
          {visible.map((reservation) => (
            <ReservationCard
              key={reservation.reservationId}
              reservation={reservation}
              onEdit={() => { setActionError(null); setEditing(reservation); }}
              onCancel={() => setCancelling(reservation)}
            />
          ))}
        </div>
      )}

      {editing && (
        <EditReservationModal
          reservation={editing}
          isSubmitting={actionPending}
          error={actionError}
          onClose={() => { setEditing(null); setActionError(null); }}
          onSave={handleSaveEdit}
        />
      )}
      {cancelling && (
        <CancelReservationDialog
          reservation={cancelling}
          isSubmitting={actionPending}
          onClose={() => setCancelling(null)}
          onConfirm={handleConfirmCancel}
        />
      )}
    </div>
  );
}
