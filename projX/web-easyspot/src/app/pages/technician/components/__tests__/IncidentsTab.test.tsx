import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IncidentsTab } from '../IncidentsTab';
import type { IssueReport } from '../../MaintenancePage';
import type { SensorDevice } from '../../../../data/technicianData';

const sensors: SensorDevice[] = [
  {
    id: 'sensor-1',
    tipo: 'IR',
    parqueId: 'park-1',
    parqueNome: 'Fórum Aveiro',
    cidade: 'Aveiro',
    zona: 'Zona A',
    status: 'falha',
    ultimaLeitura: '2026-05-12T10:00:00Z',
    uptimePercent: 0,
    taxaFalsosPositivos: 0,
    firmware: '—',
    instaladoEm: '2026-01-01T00:00:00Z',
    ultimaManutencao: '—',
    historicoErros: [],
  },
];

const issueBase: IssueReport = {
  id: 'alert-1',
  tipo: 'sensor',
  parque: 'Fórum Aveiro',
  zona: 'Zona A',
  sensorId: 'sensor-1',
  descricao: 'Falha detetada',
  severidade: 'critica',
  estado: 'aberto',
  criadoEm: '2026-05-12T10:00:00Z',
};

describe('IncidentsTab', () => {
  it('does not show Iniciar for issues already in progress inside a park', () => {
    render(
      <IncidentsTab
        issues={[{ ...issueBase, estado: 'em-progresso' }]}
        sensors={sensors}
        onSelectIssue={vi.fn()}
        onUpdateSensor={vi.fn()}
        onCreateTaskFromIssue={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /fórum aveiro/i }));

    expect(screen.getByText(/em progresso/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /colocar em progresso/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^iniciar$/i })).not.toBeInTheDocument();
  });
});
