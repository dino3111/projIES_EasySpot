import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { MaintenancePage } from '../MaintenancePage';

const techApiMock = vi.hoisted(() => ({
  fetchSensorList: vi.fn(),
  fetchSensorDetail: vi.fn(),
  fetchAlerts: vi.fn(),
  updateAlertState: vi.fn(),
  updateSensorStatus: vi.fn(),
}));

vi.mock('../../../services/technicianApi', () => techApiMock);

vi.mock('../components/IncidentsTab', () => ({
  IncidentsTab: () => <div data-testid="incidents-tab" />,
}));

vi.mock('../components/SensorsTab', () => ({
  SensorsTab: () => <div data-testid="sensors-tab" />,
}));

vi.mock('../components/TasksTab', () => ({
  TasksTab: ({
    orders,
    completedOrders,
    onUpdate,
    onNewOrder,
  }: {
    orders: Array<{ id: string; state: string }>;
    completedOrders: Array<{ id: string }>;
    onUpdate: (id: string, state: 'em-progresso' | 'concluida') => void;
    onNewOrder: () => void;
  }) => (
    <div>
      <span data-testid="open-orders">{orders.filter((order) => order.state !== 'RESOLVED').length}</span>
      <span data-testid="completed-orders">{completedOrders.length}</span>
      {orders.map((order) => (
        <button key={order.id} onClick={() => onUpdate(order.id, 'concluida')}>
          concluir-{order.id}
        </button>
      ))}
      <button onClick={onNewOrder}>abrir-nova-ordem</button>
    </div>
  ),
}));

vi.mock('../components/IssueDetailModal', () => ({
  IssueDetailModal: () => null,
}));

vi.mock('../components/SensorModals', () => ({
  SensorDiagPanel: () => null,
  StatusUpdateModal: () => null,
}));

vi.mock('../components/OrderModals', () => ({
  NewOrderModal: ({
    onCreate,
    onClose,
  }: {
    onCreate: (sensorId: string, titulo: string, descricao: string, prioridade: string) => void;
    onClose: () => void;
  }) => (
    <div role="dialog" aria-label="Nova ordem de manutenção">
      <button onClick={() => onCreate('sensor-1', 'Trocar sensor', 'Detalhe', 'media')}>
        confirmar-criacao
      </button>
      <button onClick={onClose}>fechar</button>
    </div>
  ),
}));

const sensorList = [
  {
    sensorId: 'sensor-1',
    parkingLotId: 'park-1',
    parkingLotName: 'Fórum Aveiro',
    parkingLotCity: 'Aveiro',
    zone: 'Zona A',
    status: 'operational',
    lastSeenAt: '2026-05-12T10:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
  },
];

describe('MaintenancePage', () => {
  beforeEach(() => {
    techApiMock.fetchSensorList.mockResolvedValue(sensorList);
    techApiMock.fetchAlerts.mockResolvedValue([]);
    techApiMock.fetchSensorDetail.mockResolvedValue({ ...sensorList[0], logs: [] });
    techApiMock.updateAlertState.mockResolvedValue(undefined);
    techApiMock.updateSensorStatus.mockResolvedValue(undefined);
  });

  it('shows an error toast when creating a task without an open alert for the sensor', async () => {
    render(
      <MemoryRouter>
        <MaintenancePage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByTestId('incidents-tab')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('tab', { name: /tarefas/i }));
    fireEvent.click(await screen.findByText('abrir-nova-ordem'));
    fireEvent.click(await screen.findByText('confirmar-criacao'));

    await waitFor(() => expect(screen.getByRole('status')).toHaveClass('bg-red-600'));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Não foi possível criar a tarefa "Trocar sensor": não existe nenhum alerta aberto para o sensor sensor-1.'
    );
  });

  it('keeps an existing open alert pending when creating a task', async () => {
    techApiMock.fetchAlerts.mockResolvedValueOnce([
      {
        id: 'alert-1',
        type: 'SENSOR',
        park: 'Fórum Aveiro',
        zone: 'Zona A',
        spotNumber: null,
        sensorId: 'sensor-1',
        plate: null,
        description: 'Falha detetada',
        severity: 'CRITICAL',
        state: 'OPEN',
        createdAt: '2026-05-12T10:00:00Z',
        attributedTo: null,
        notes: null,
      },
    ]);

    render(
      <MemoryRouter>
        <MaintenancePage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByTestId('incidents-tab')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('tab', { name: /tarefas/i }));
    fireEvent.click(await screen.findByText('abrir-nova-ordem'));
    fireEvent.click(await screen.findByText('confirmar-criacao'));

    await waitFor(() => expect(techApiMock.updateAlertState).toHaveBeenCalledWith('alert-1', 'OPEN', expect.stringContaining('PRIORITY:MEDIUM')));
  });

  it('increments completed task count immediately when completing a task', async () => {
    const openAlert = {
      id: 'alert-1',
      type: 'SENSOR',
      park: 'Fórum Aveiro',
      zone: 'Zona A',
      spotNumber: null,
      sensorId: 'sensor-1',
      plate: null,
      description: 'Falha detetada',
      severity: 'CRITICAL',
      state: 'OPEN',
      createdAt: '2026-05-12T10:00:00Z',
      attributedTo: null,
      notes: null,
    };
    techApiMock.fetchAlerts.mockImplementation((query?: { state?: string }) => {
      if (query?.state === 'OPEN') return Promise.resolve([openAlert]);
      return Promise.resolve([]);
    });

    render(
      <MemoryRouter initialEntries={['/technician/maintenance?tab=tasks']}>
        <MaintenancePage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByTestId('open-orders')).toHaveTextContent('1'));
    expect(screen.getByTestId('completed-orders')).toHaveTextContent('0');

    fireEvent.click(screen.getByText('concluir-alert-1'));

    await waitFor(() => expect(techApiMock.updateAlertState).toHaveBeenCalledWith('alert-1', 'RESOLVED'));
    await waitFor(() => expect(screen.getByTestId('completed-orders')).toHaveTextContent('1'));
    expect(screen.getByTestId('open-orders')).toHaveTextContent('0');
  });
});
