import { withGlobalLoading } from '../app/context/LoadingContext';

const API_BASE = '/api/reservations';

export interface CreateReservationRequest {
  parkId: string;
  vehicleId: string;
  arrivalDateTime: string;
  departureDateTime: string;
  selectedSpotId?: string | null;
}

export interface ReservationResponse {
  reservationId: string;
  bookingCode: string;
  parkId: string;
  parkName: string;
  parkAddress: string;
  spotId: string | null;
  spotNumber: string | null;
  vehicleId: string | null;
  arrivalDateTime: string;
  departureDateTime: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED' | 'COMPLETED';
  lockedUntil: string;
  estimatedCost: number;
}

export async function createReservation(
  request: CreateReservationRequest,
  token: string,
  idempotencyKey?: string,
): Promise<ReservationResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const res = await withGlobalLoading(() => fetch(API_BASE, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      parkId: request.parkId,
      vehicleId: request.vehicleId,
      arrivalDateTime: request.arrivalDateTime,
      departureDateTime: request.departureDateTime,
      selectedSpotId: request.selectedSpotId ?? null,
    }),
  }));

  if (!res.ok) {
    const rawBody = await res.text().catch(() => '');
    const message = buildReservationErrorMessage(res.status, rawBody);
    throw Object.assign(new Error(message), { status: res.status });
  }

  return res.json() as Promise<ReservationResponse>;
}

function buildReservationErrorMessage(status: number, body: string): string {
  const trimmed = body.trim();

  if (!trimmed) {
    return defaultReservationErrorMessage(status);
  }

  try {
    const parsed = JSON.parse(trimmed) as { detail?: string; title?: string; message?: string };
    const message = parsed.detail ?? parsed.message ?? parsed.title;
    if (message) {
      return normalizeReservationErrorMessage(status, message);
    }
  } catch {
    // Fall through to plain-text handling.
  }

  return normalizeReservationErrorMessage(status, trimmed);
}

function normalizeReservationErrorMessage(status: number, message: string): string {
  const lowered = message.toLowerCase();
  if (status === 422 && (lowered.includes('stripe') || lowered.includes('payment') || lowered.includes('caução'))) {
    return 'Antes de reservar, configure um método de pagamento Stripe nas suas definições.';
  }
  if (status === 409) {
    return 'O lugar ou o parque já não está disponível para o período selecionado.';
  }
  if (status === 404) {
    return 'Não foi possível encontrar o parque, veículo ou lugar selecionado.';
  }
  return message;
}

function defaultReservationErrorMessage(status: number): string {
  switch (status) {
    case 422:
      return 'Não foi possível validar a reserva. Verifique horários e configuração de pagamento.';
    case 409:
      return 'Não foi possível concluir a reserva porque existe um conflito de disponibilidade.';
    case 404:
      return 'O parque, veículo ou lugar selecionado não foi encontrado.';
    default:
      return `HTTP ${status}`;
  }
}

const FALLBACK_LOCK_SECONDS = 30 * 60;

export function lockedUntilCountdownSeconds(lockedUntil: string): number {
  const lockDate = new Date(lockedUntil);
  if (Number.isNaN(lockDate.getTime())) return FALLBACK_LOCK_SECONDS;
  const diff = Math.floor((lockDate.getTime() - Date.now()) / 1000);
  return diff > 0 ? diff : FALLBACK_LOCK_SECONDS;
}
