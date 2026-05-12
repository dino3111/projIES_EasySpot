import type { ReservationResponse } from '../../../../services/reservationService';

export type ReservationStatus = ReservationResponse['status'];

export const STATUS_META: Record<ReservationStatus, { label: string; badgeClass: string; icon: string }> = {
  PENDING:   { label: 'Pendente',   badgeClass: 'bg-warning/15 text-warning',  icon: 'fa-hourglass-half' },
  CONFIRMED: { label: 'Confirmada', badgeClass: 'bg-primary/15 text-primary',  icon: 'fa-circle-check' },
  CANCELLED: { label: 'Cancelada',  badgeClass: 'bg-error/15 text-error',      icon: 'fa-circle-xmark' },
  EXPIRED:   { label: 'Expirada',   badgeClass: 'bg-muted text-muted-foreground', icon: 'fa-clock' },
  COMPLETED: { label: 'Concluída',  badgeClass: 'bg-success/15 text-success',  icon: 'fa-flag-checkered' },
};

export function isFuture(reservation: ReservationResponse): boolean {
  return new Date(reservation.arrivalDateTime).getTime() > Date.now();
}

export function canEditOrCancel(reservation: ReservationResponse): boolean {
  return reservation.status === 'CONFIRMED' && isFuture(reservation);
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function toLocalDateTimeInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromLocalDateTimeInput(local: string): string {
  return new Date(local).toISOString();
}

export type ReservationFilter = 'upcoming' | 'past' | 'all';

export function filterReservations(list: readonly ReservationResponse[], filter: ReservationFilter): ReservationResponse[] {
  if (filter === 'all') return [...list];
  if (filter === 'upcoming') {
    return list.filter((r) => isFuture(r) && (r.status === 'CONFIRMED' || r.status === 'PENDING'));
  }
  return list.filter((r) => !isFuture(r) || r.status === 'CANCELLED' || r.status === 'EXPIRED' || r.status === 'COMPLETED');
}
