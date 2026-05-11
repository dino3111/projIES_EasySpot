import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createReservation } from '../reservationService';

const loadingMock = vi.hoisted(() => ({
  withGlobalLoading: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

vi.mock('../../app/context/LoadingContext', () => loadingMock);

describe('reservationService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('maps Stripe-related 422 responses to a helpful message', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response('Não foi encontrado um método de pagamento Stripe guardado para a reserva.', {
        status: 422,
        headers: { 'content-type': 'text/plain' },
      }),
    );

    await expect(
      createReservation(
        {
          parkId: 'park-1',
          vehicleId: 'vehicle-1',
          arrivalDateTime: '2026-05-12T10:00:00.000Z',
          departureDateTime: '2026-05-12T12:00:00.000Z',
          selectedSpotId: null,
        },
        'token-123',
      ),
    ).rejects.toThrow('Antes de reservar, configure um método de pagamento Stripe nas suas definições.');
  });
});
