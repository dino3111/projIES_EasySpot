import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TasksTab } from './TasksTab';
import type { SensorDevice } from '../../../data/technicianData';
import type { WorkOrder } from '../../../services/technicianApi';

vi.mock('./shared', () => ({
  QuickStat: ({ label, value }: { label: string; value: string | number }) => (
    <div>{label}: {value}</div>
  ),
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>,
}));

const sensors: SensorDevice[] = [];

const orders: WorkOrder[] = [
  {
    id: 'order-1',
    type: 'SENSOR',
    park: 'Fórum Aveiro',
    zone: 'Zona A',
    sensorId: 'sensor-1',
    description: 'Substituir sensor crítico',
    severity: 'CRITICAL',
    state: 'OPEN',
    createdAt: '2026-05-12T10:00:00Z',
    attributedTo: null,
    notes: 'PRIORITY:CRITICAL',
  },
  {
    id: 'order-2',
    type: 'SENSOR',
    park: 'Fórum Aveiro',
    zone: 'Zona B',
    sensorId: 'sensor-2',
    description: 'Substituir sensor alto',
    severity: 'WARNING',
    state: 'OPEN',
    createdAt: '2026-05-12T11:00:00Z',
    attributedTo: null,
    notes: 'PRIORITY:HIGH',
  },
  {
    id: 'order-3',
    type: 'SENSOR',
    park: 'Fórum Aveiro',
    zone: 'Zona C',
    sensorId: 'sensor-3',
    description: 'Substituir sensor em curso',
    severity: 'INFO',
    state: 'IN_PROGRESS',
    createdAt: '2026-05-12T12:00:00Z',
    attributedTo: null,
    notes: 'PRIORITY:MEDIUM',
  },
];

describe('TasksTab', () => {
  it('shows only critical open tasks in urgent and all open tasks in pending', () => {
    render(
      <TasksTab
        orders={orders}
        sensors={sensors}
        onUpdate={vi.fn()}
        onNewOrder={vi.fn()}
      />,
    );

    expect(screen.getByText('Urgentes: 1')).toBeInTheDocument();
    expect(screen.getByText('Pendentes: 3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /urgentes/i }));

    expect(screen.getByText('Substituir sensor crítico')).toBeInTheDocument();
    expect(screen.queryByText('Substituir sensor alto')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /pendentes/i }));

    expect(screen.getByText('Substituir sensor crítico')).toBeInTheDocument();
    expect(screen.getByText('Substituir sensor alto')).toBeInTheDocument();
    expect(screen.getByText('Substituir sensor em curso')).toBeInTheDocument();
  });
});
