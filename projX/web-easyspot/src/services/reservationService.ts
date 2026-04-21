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

  const res = await fetch(API_BASE, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      parkId: request.parkId,
      vehicleId: request.vehicleId,
      arrivalDateTime: request.arrivalDateTime,
      departureDateTime: request.departureDateTime,
      selectedSpotId: request.selectedSpotId ?? null,
    }),
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({})) as { detail?: string; title?: string };
    const message = detail.detail ?? detail.title ?? `HTTP ${res.status}`;
    throw Object.assign(new Error(message), { status: res.status });
  }

  return res.json() as Promise<ReservationResponse>;
}

const FALLBACK_LOCK_SECONDS = 30 * 60;

export function lockedUntilCountdownSeconds(lockedUntil: string): number {
  const lockDate = new Date(lockedUntil);
  if (isNaN(lockDate.getTime())) return FALLBACK_LOCK_SECONDS;
  const diff = Math.floor((lockDate.getTime() - Date.now()) / 1000);
  return diff > 0 ? diff : FALLBACK_LOCK_SECONDS;
}
