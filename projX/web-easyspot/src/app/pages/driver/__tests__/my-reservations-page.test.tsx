import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MyReservationsPage } from '../reservations/MyReservationsPage';

const now = new Date();
const futureArrival = new Date(now.getTime() + 24 * 60 * 60 * 1000);
const futureDeparture = new Date(now.getTime() + 26 * 60 * 60 * 1000);
const pastArrival = new Date(now.getTime() - 48 * 60 * 60 * 1000);
const pastDeparture = new Date(now.getTime() - 46 * 60 * 60 * 1000);
const lockedUntil = new Date(now.getTime() + 25 * 60 * 60 * 1000);

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));

const reservationServiceMock = vi.hoisted(() => ({
  listReservations: vi.fn(),
  updateReservation: vi.fn(),
  cancelReservation: vi.fn(),
}));

vi.mock('../../../../services/reservationService', () => reservationServiceMock);
vi.mock('../../../services/authToken', () => ({ getAccessToken: vi.fn(() => 'token-123') }));
vi.mock('sonner', () => ({ toast: toastMock }));

vi.mock('../reservations/EditReservationModal', () => ({
  EditReservationModal: ({ error, onClose, onSave }: {
    error: string | null;
    onClose: () => void;
    onSave: (values: { arrivalDateTime: string; departureDateTime: string; selectedSpotId: string | null }) => void;
  }) => (
    <div>
      <span>Editar modal</span>
      {error && <span>{error}</span>}
      <button onClick={() => onSave({
        arrivalDateTime: futureArrival.toISOString(),
        departureDateTime: futureDeparture.toISOString(),
        selectedSpotId: null,
      })}
      >
        Guardar edição
      </button>
      <button onClick={onClose}>Fechar edição</button>
    </div>
  ),
}));

vi.mock('../reservations/CancelReservationDialog', () => ({
  CancelReservationDialog: ({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) => (
    <div>
      <span>Cancelar modal</span>
      <button onClick={onConfirm}>Confirmar cancelamento</button>
      <button onClick={onClose}>Fechar cancelamento</button>
    </div>
  ),
}));

const futureReservation = {
  reservationId: 'res-future',
  bookingCode: 'ES-FUTURE',
  parkId: 'park-1',
  parkName: 'Parque Futuro',
  parkAddress: 'Rua A',
  spotId: 'spot-1',
  spotNumber: 'A1',
  vehicleId: 'veh-1',
  arrivalDateTime: futureArrival.toISOString(),
  departureDateTime: futureDeparture.toISOString(),
  status: 'CONFIRMED' as const,
  lockedUntil: lockedUntil.toISOString(),
  estimatedCost: 4.5,
};

const pastReservation = {
  ...futureReservation,
  reservationId: 'res-past',
  bookingCode: 'ES-PAST',
  parkName: 'Parque Passado',
  arrivalDateTime: pastArrival.toISOString(),
  departureDateTime: pastDeparture.toISOString(),
  status: 'COMPLETED' as const,
};

describe('MyReservationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reservationServiceMock.listReservations.mockResolvedValue([futureReservation, pastReservation]);
  });

  it('carrega reservas e permite filtrar histórico', async () => {
    render(<MemoryRouter><MyReservationsPage /></MemoryRouter>);

    expect(await screen.findByText(/Parque Futuro/i)).toBeInTheDocument();
    expect(screen.queryByText(/Parque Passado/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Histórico/i }));

    expect(await screen.findByText(/Parque Passado/i)).toBeInTheDocument();
  });

  it('mostra toast de erro quando o update devolve REFUND_FAILED', async () => {
    reservationServiceMock.updateReservation.mockResolvedValue({
      reservation: futureReservation,
      previousCost: 6,
      newCost: 4.5,
      costDelta: -1.5,
      paymentAdjustmentKind: 'REFUND_FAILED',
      paymentStatus: 'refund_failed',
      stripeReferenceId: null,
    });

    render(<MemoryRouter><MyReservationsPage /></MemoryRouter>);

    fireEvent.click(await screen.findByRole('button', { name: /Editar/i }));
    fireEvent.click(screen.getByRole('button', { name: /Guardar edição/i }));

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        'Reserva atualizada, mas o reembolso falhou. Tenta novamente dentro de instantes ou contacta o suporte.',
      ));
  });

  it('mostra erro inline quando o update falha', async () => {
    reservationServiceMock.updateReservation.mockRejectedValue(new Error('Falha ao atualizar'));

    render(<MemoryRouter><MyReservationsPage /></MemoryRouter>);

    fireEvent.click(await screen.findByRole('button', { name: /Editar/i }));
    fireEvent.click(screen.getByRole('button', { name: /Guardar edição/i }));

    expect(await screen.findByText(/Falha ao atualizar/i)).toBeInTheDocument();
  });

  it('cancela com sucesso e mostra toast', async () => {
    reservationServiceMock.cancelReservation.mockResolvedValue({
      ...futureReservation,
      status: 'CANCELLED',
    });

    render(<MemoryRouter><MyReservationsPage /></MemoryRouter>);

    fireEvent.click(await screen.findByRole('button', { name: /Cancelar/i }));
    fireEvent.click(screen.getByRole('button', { name: /Confirmar cancelamento/i }));

    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Reserva cancelada'));
  });

  it('mostra toast quando o cancelamento falha', async () => {
    reservationServiceMock.cancelReservation.mockRejectedValue(new Error('Falha ao cancelar'));

    render(<MemoryRouter><MyReservationsPage /></MemoryRouter>);

    fireEvent.click(await screen.findByRole('button', { name: /Cancelar/i }));
    fireEvent.click(screen.getByRole('button', { name: /Confirmar cancelamento/i }));

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Falha ao cancelar'));
  });
});
