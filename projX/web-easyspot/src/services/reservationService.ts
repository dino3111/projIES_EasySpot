import { withGlobalLoading } from '../app/context/LoadingContext';

const API_BASE = '/api/reservations';
const RETRYABLE_STATUSES = new Set([502, 503, 504]);
const RETRY_DELAY_MS = 700;

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
  if (status === 502 || status === 503 || status === 504) {
    return 'Serviço temporariamente indisponível. Tente novamente em alguns segundos.';
  }
  if (status === 422 && (lowered.includes('stripe') || lowered.includes('payment') || lowered.includes('caução'))) {
    return 'Antes de reservar, configure um método de pagamento Stripe nas suas definições.';
  }
  if (lowered.includes('card_declined') || lowered.includes('cartão recusado') || lowered.includes('your card was declined')) {
    return 'O cartão associado à tua conta foi recusado. Atualiza o método de pagamento Stripe e tenta novamente.';
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

export interface ReservationUpdatePreviewResponse {
  previousCost: number;
  newCost: number;
  costDelta: number;
}

export interface ReservationUpdateResponse {
  reservation: ReservationResponse;
  previousCost: number;
  newCost: number;
  costDelta: number;
  paymentAdjustmentKind:
    | 'NO_CHANGE'
    | 'CHARGED'
    | 'CHARGE_PENDING'
    | 'CHARGE_FAILED'
    | 'REFUNDED'
    | 'REFUND_PENDING'
    | 'REFUND_FAILED'
    | 'ALREADY_REFUNDED';
  paymentStatus: string | null;
  stripeReferenceId: string | null;
}

export interface UpdateReservationRequest {
  parkId: string;
  vehicleId: string;
  arrivalDateTime: string;
  departureDateTime: string;
  selectedSpotId?: string | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isReservationResponse(value: unknown): value is ReservationResponse {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ReservationResponse>;
  return typeof candidate.reservationId === 'string'
    && typeof candidate.bookingCode === 'string'
    && typeof candidate.parkId === 'string'
    && typeof candidate.arrivalDateTime === 'string'
    && typeof candidate.departureDateTime === 'string'
    && typeof candidate.status === 'string';
}

function normalizeReservationList(value: unknown): ReservationResponse[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isReservationResponse);
}

function normalizeUpdateResponse(value: unknown): ReservationUpdateResponse {
  if (isReservationResponse(value)) {
    return {
      reservation: value,
      previousCost: Number(value.estimatedCost ?? 0),
      newCost: Number(value.estimatedCost ?? 0),
      costDelta: 0,
      paymentAdjustmentKind: 'NO_CHANGE',
      paymentStatus: null,
      stripeReferenceId: null,
    };
  }

  if (value && typeof value === 'object') {
    const candidate = value as Partial<ReservationUpdateResponse> & { reservation?: unknown };
    if (isReservationResponse(candidate.reservation)) {
      return {
        reservation: candidate.reservation,
        previousCost: Number(candidate.previousCost ?? candidate.reservation.estimatedCost ?? 0),
        newCost: Number(candidate.newCost ?? candidate.reservation.estimatedCost ?? 0),
        costDelta: Number(candidate.costDelta ?? 0),
        paymentAdjustmentKind: candidate.paymentAdjustmentKind ?? 'NO_CHANGE',
        paymentStatus: candidate.paymentStatus ?? null,
        stripeReferenceId: candidate.stripeReferenceId ?? null,
      };
    }
  }

  throw new Error('Resposta inesperada ao atualizar a reserva.');
}

function authHeaders(token: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function handleJsonResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const rawBody = await res.text().catch(() => '');
    const message = buildReservationErrorMessage(res.status, rawBody);
    throw Object.assign(new Error(message), { status: res.status });
  }
  return res.json() as Promise<T>;
}

async function fetchReservation(input: string, init: RequestInit, allowRetry = false): Promise<Response> {
  const attempts = allowRetry ? 2 : 1;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const res = await withGlobalLoading(() => fetch(input, init));
      if (!RETRYABLE_STATUSES.has(res.status) || attempt === attempts) {
        return res;
      }
    } catch (error) {
      if (attempt === attempts) throw error;
    }

    await sleep(RETRY_DELAY_MS);
  }

  throw new Error('Serviço temporariamente indisponível. Tente novamente em alguns segundos.');
}

export async function listReservations(token: string): Promise<ReservationResponse[]> {
  const res = await fetchReservation(API_BASE, {
    method: 'GET',
    headers: authHeaders(token),
  }, true);
  const data = await handleJsonResponse<unknown>(res);
  return normalizeReservationList(data);
}

export async function getReservation(reservationId: string, token: string): Promise<ReservationResponse> {
  const res = await fetchReservation(`${API_BASE}/${reservationId}`, {
    method: 'GET',
    headers: authHeaders(token),
  }, true);
  return handleJsonResponse<ReservationResponse>(res);
}

export async function previewReservationUpdate(
  reservationId: string,
  request: UpdateReservationRequest,
  token: string,
): Promise<ReservationUpdatePreviewResponse | null> {
  const res = await fetchReservation(`${API_BASE}/${reservationId}/preview-update`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      parkId: request.parkId,
      vehicleId: request.vehicleId,
      arrivalDateTime: request.arrivalDateTime,
      departureDateTime: request.departureDateTime,
      selectedSpotId: request.selectedSpotId ?? null,
    }),
  }, true);
  if (res.status === 404) {
    const rawBody = await res.text().catch(() => '');
    const trimmed = rawBody.trim();
    const isHtml404 = trimmed.startsWith('<!DOCTYPE html') || trimmed.startsWith('<html');
    if (!trimmed || isHtml404) return null;
    const message = buildReservationErrorMessage(res.status, rawBody);
    throw Object.assign(new Error(message), { status: res.status });
  }
  return handleJsonResponse<ReservationUpdatePreviewResponse>(res);
}

export async function updateReservation(
  reservationId: string,
  request: UpdateReservationRequest,
  token: string,
): Promise<ReservationUpdateResponse> {
  const res = await withGlobalLoading(() => fetch(`${API_BASE}/${reservationId}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({
      parkId: request.parkId,
      vehicleId: request.vehicleId,
      arrivalDateTime: request.arrivalDateTime,
      departureDateTime: request.departureDateTime,
      selectedSpotId: request.selectedSpotId ?? null,
    }),
  }));
  const data = await handleJsonResponse<unknown>(res);
  return normalizeUpdateResponse(data);
}

export async function cancelReservation(reservationId: string, token: string): Promise<ReservationResponse> {
  const res = await withGlobalLoading(() => fetch(`${API_BASE}/${reservationId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  }));
  return handleJsonResponse<ReservationResponse>(res);
}

export function lockedUntilCountdownSeconds(lockedUntil: string): number {
  const lockDate = new Date(lockedUntil);
  if (Number.isNaN(lockDate.getTime())) return FALLBACK_LOCK_SECONDS;
  const diff = Math.floor((lockDate.getTime() - Date.now()) / 1000);
  return diff > 0 ? diff : FALLBACK_LOCK_SECONDS;
}
