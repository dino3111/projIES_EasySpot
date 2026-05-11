import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import { ReportPage } from '../report/ReportPage';

vi.mock('../../../../services/vehicleLookup', () => ({
  lookupVehicleData: vi.fn().mockResolvedValue({}),
}));

const parksCatalogMock = vi.hoisted(() => ({
  fetchAllParksSummary: vi.fn(),
}));
vi.mock('../../../services/parksCatalog', () => parksCatalogMock);

const apiServiceMock = vi.hoisted(() => ({
  reportApi: { submit: vi.fn() },
}));
vi.mock('../../../../services/apiService', () => apiServiceMock);

const parks = [
  { id: 'park-1', name: 'Parque Central', localidade: 'Aveiro' },
  { id: 'park-2', name: 'Forum Aveiro', localidade: 'Aveiro' },
];

function renderReport(search = '') {
  return render(
    <MemoryRouter initialEntries={[`/report${search}`]}>
      <ReportPage />
    </MemoryRouter>,
  );
}

describe('ReportPage — Step1Form', () => {
  beforeEach(() => {
    parksCatalogMock.fetchAllParksSummary.mockResolvedValue(parks);
  });

  it('renders form title', async () => {
    renderReport();
    expect(await screen.findByText(/Reportar Estacionamento/i)).toBeInTheDocument();
  });

  it('shows park list from API', async () => {
    renderReport();
    await waitFor(() =>
      expect(screen.getByRole('option', { name: /Parque Central/i })).toBeInTheDocument(),
    );
  });

  it('pre-fills parkId from query param', async () => {
    renderReport('?parkId=park-2');
    await waitFor(() => {
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('park-2');
    });
  });

  it('shows validation errors on empty submit', async () => {
    renderReport();
    await screen.findByText(/Reportar Estacionamento/i);

    fireEvent.click(screen.getByRole('button', { name: /Enviar Denúncia/i }));

    expect(await screen.findByText(/Selecione um parque/i)).toBeInTheDocument();
    expect(screen.getByText(/Indique a zona/i)).toBeInTheDocument();
    expect(screen.getByText(/Indique o número do lugar/i)).toBeInTheDocument();
    expect(screen.getByText(/Selecione o tipo de infração/i)).toBeInTheDocument();
    expect(screen.getByText(/A descrição deve ter/i)).toBeInTheDocument();
  });

  it('shows error when description is too short', async () => {
    renderReport();
    await screen.findByText(/Reportar Estacionamento/i);

    fireEvent.change(screen.getByPlaceholderText(/Descreva o que observou/i), {
      target: { value: 'curto' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Enviar Denúncia/i }));

    expect(await screen.findByText(/pelo menos 10 caracteres/i)).toBeInTheDocument();
  });

  it('submits valid form and shows confirmation', async () => {
    apiServiceMock.reportApi.submit.mockResolvedValue({
      id: 'rep-uuid-001',
      type: 'CLIENT',
      parkId: 'park-1',
      parkName: 'Parque Central',
      zone: 'A',
      spotNumber: 'A-07',
      plate: 'AA-12-BB',
      description: 'Veículo sem dístico no lugar de mobilidade reduzida.',
      photoUrl: null,
      severity: 'WARNING',
      state: 'OPEN',
      createdAt: '2026-05-10T10:00:00Z',
    });

    renderReport();
    await screen.findByRole('option', { name: /Parque Central/i });

    // Fill form
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'park-1' } });
    fireEvent.change(screen.getByPlaceholderText(/Ex: Piso -1, Zona A/i), { target: { value: 'A' } });
    fireEvent.change(screen.getByPlaceholderText(/Ex: A-07, MR-02/i), { target: { value: 'A-07' } });
    fireEvent.click(screen.getByRole('button', { name: /Lugar de Mobilidade Reduzida/i }));
    fireEvent.change(screen.getByPlaceholderText(/Descreva o que observou/i), {
      target: { value: 'Veículo sem dístico no lugar de mobilidade reduzida.' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Enviar Denúncia/i }));
    });

    expect(await screen.findByText(/Denúncia Enviada/i)).toBeInTheDocument();
    expect(apiServiceMock.reportApi.submit).toHaveBeenCalledWith(
      expect.objectContaining({
        parkingLotId: 'park-1',
        zone: 'A',
        spotNumber: 'A-07',
        violationType: 'accessible',
        description: 'Veículo sem dístico no lugar de mobilidade reduzida.',
      }),
    );
  });

  it('shows API error message on submit failure', async () => {
    apiServiceMock.reportApi.submit.mockRejectedValue(new Error('Serviço indisponível'));

    renderReport();
    await screen.findByRole('option', { name: /Parque Central/i });

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'park-1' } });
    fireEvent.change(screen.getByPlaceholderText(/Ex: Piso -1, Zona A/i), { target: { value: 'B' } });
    fireEvent.change(screen.getByPlaceholderText(/Ex: A-07, MR-02/i), { target: { value: 'B-02' } });
    fireEvent.click(screen.getByRole('button', { name: /A Bloquear Acesso/i }));
    fireEvent.change(screen.getByPlaceholderText(/Descreva o que observou/i), {
      target: { value: 'Veículo bloqueia saída de emergência completamente.' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Enviar Denúncia/i }));
    });

    expect(await screen.findByText(/Serviço indisponível/i)).toBeInTheDocument();
    expect(screen.queryByText(/Denúncia Enviada/i)).not.toBeInTheDocument();
  });

  it('disables submit button while submitting', async () => {
    let resolveSubmit!: (v: unknown) => void;
    apiServiceMock.reportApi.submit.mockReturnValue(new Promise((r) => { resolveSubmit = r; }));

    renderReport();
    await screen.findByRole('option', { name: /Parque Central/i });

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'park-1' } });
    fireEvent.change(screen.getByPlaceholderText(/Ex: Piso -1, Zona A/i), { target: { value: 'C' } });
    fireEvent.change(screen.getByPlaceholderText(/Ex: A-07, MR-02/i), { target: { value: 'C-01' } });
    fireEvent.click(screen.getByRole('button', { name: /Lugar Reservado/i }));
    fireEvent.change(screen.getByPlaceholderText(/Descreva o que observou/i), {
      target: { value: 'Veículo sem autorização no lugar reservado para autocarro.' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Enviar Denúncia/i }));
    });

    expect(screen.getByRole('button', { name: /A enviar/i })).toBeDisabled();
    resolveSubmit({ id: 'x', type: 'CLIENT', parkId: 'p', parkName: 'p', zone: 'C', spotNumber: 'C-01', plate: null, description: 'd', photoUrl: null, severity: 'WARNING', state: 'OPEN', createdAt: '' });
  });
});

describe('ReportPage — Step2Confirmation', () => {
  beforeEach(() => {
    parksCatalogMock.fetchAllParksSummary.mockResolvedValue(parks);
    apiServiceMock.reportApi.submit.mockResolvedValue({
      id: 'rep-uuid-002',
      type: 'CLIENT',
      parkId: 'park-1',
      parkName: 'Parque Central',
      zone: 'D',
      spotNumber: 'D-05',
      plate: null,
      description: 'Veículo bloqueia saída de emergência completamente.',
      photoUrl: null,
      severity: 'CRITICAL',
      state: 'OPEN',
      createdAt: '2026-05-10T11:00:00Z',
    });
  });

  async function submitAndGetConfirmation() {
    renderReport();
    await screen.findByRole('option', { name: /Parque Central/i });

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'park-1' } });
    fireEvent.change(screen.getByPlaceholderText(/Ex: Piso -1, Zona A/i), { target: { value: 'D' } });
    fireEvent.change(screen.getByPlaceholderText(/Ex: A-07, MR-02/i), { target: { value: 'D-05' } });
    fireEvent.click(screen.getByRole('button', { name: /A Bloquear Acesso/i }));
    fireEvent.change(screen.getByPlaceholderText(/Descreva o que observou/i), {
      target: { value: 'Veículo bloqueia saída de emergência completamente.' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Enviar Denúncia/i }));
    });

    return screen.findByText(/Denúncia Enviada/i);
  }

  it('shows confirmation page after submit', async () => {
    await submitAndGetConfirmation();
    expect(screen.getByText(/Denúncia Enviada/i)).toBeInTheDocument();
    expect(screen.getByText(/Em análise/i)).toBeInTheDocument();
  });

  it('allows starting a new report from confirmation', async () => {
    await submitAndGetConfirmation();
    fireEvent.click(screen.getByRole('button', { name: /Nova Denúncia/i }));
    expect(await screen.findByText(/Reportar Estacionamento/i)).toBeInTheDocument();
  });
});
