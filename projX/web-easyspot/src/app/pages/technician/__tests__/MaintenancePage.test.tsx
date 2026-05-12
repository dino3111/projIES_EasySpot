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
  TasksTab: ({ onNewOrder }: { onNewOrder: () => void }) => (
    <button onClick={onNewOrder}>abrir-nova-ordem</button>
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
});
