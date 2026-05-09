import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSensorList, useSensorDetail } from '../hooks/useTechnicianData';

const techApiMock = vi.hoisted(() => ({
  fetchSensorList: vi.fn(),
  fetchSensorDetail: vi.fn(),
}));

vi.mock('../../../services/technicianApi', () => techApiMock);

const mockSensors = [
  {
    sensorId: 'IR-CO1-MR02',
    parkingLotId: 'b231a846-7d40-5100-ba29-b9c0ca0ef9aa',
    parkingLotName: 'Estádio Cidade de Coimbra',
    zone: 'Piso -1 – Mobilidade Reduzida',
    status: 'offline',
    lastSeenAt: '2026-05-08T08:00:00Z',
    createdAt: '2024-04-10T00:00:00Z',
  },
  {
    sensorId: 'GW-CO1-01',
    parkingLotId: 'b231a846-7d40-5100-ba29-b9c0ca0ef9aa',
    parkingLotName: 'Estádio Cidade de Coimbra',
    zone: 'Sala Técnica',
    status: 'operational',
    lastSeenAt: '2026-05-08T10:47:00Z',
    createdAt: '2024-03-28T00:00:00Z',
  },
];

const mockDetail = {
  ...mockSensors[0],
  logs: [
    {
      alertId: 'alert-uuid-001',
      type: 'sensor',
      severity: 'critical',
      state: 'open',
      description: 'Falha total do sensor MR-02.',
      createdAt: '2026-05-08T08:00:00Z',
      resolvedAt: null,
    },
    {
      alertId: 'alert-uuid-002',
      type: 'sensor',
      severity: 'warning',
      state: 'resolved',
      description: 'Potência IR reduzida a 25% da nominal.',
      createdAt: '2026-05-04T10:00:00Z',
      resolvedAt: '2026-05-05T08:00:00Z',
    },
  ],
};

describe('useSensorList', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts in loading state', () => {
    techApiMock.fetchSensorList.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useSensorList());

    expect(result.current.status).toBe('loading');
  });

  it('transitions to ok with data on success', async () => {
    techApiMock.fetchSensorList.mockResolvedValueOnce(mockSensors);

    const { result } = renderHook(() => useSensorList());

    await waitFor(() => expect(result.current.status).toBe('ok'));

    if (result.current.status === 'ok') {
      expect(result.current.data).toHaveLength(2);
      expect(result.current.data[0].sensorId).toBe('IR-CO1-MR02');
      expect(result.current.data[1].status).toBe('operational');
    }
  });

  it('transitions to error state on API failure', async () => {
    techApiMock.fetchSensorList.mockRejectedValueOnce(new Error('Serviço indisponível'));

    const { result } = renderHook(() => useSensorList());

    await waitFor(() => expect(result.current.status).toBe('error'));

    if (result.current.status === 'error') {
      expect(result.current.message).toBe('Serviço indisponível');
    }
  });

  it('uses fallback message when error is not an Error instance', async () => {
    techApiMock.fetchSensorList.mockRejectedValueOnce('string error');

    const { result } = renderHook(() => useSensorList());

    await waitFor(() => expect(result.current.status).toBe('error'));

    if (result.current.status === 'error') {
      expect(result.current.message).toBe('Erro ao carregar sensores.');
    }
  });
});

describe('useSensorDetail', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when sensorId is null', () => {
    const { result } = renderHook(() => useSensorDetail(null));

    expect(result.current).toBeNull();
    expect(techApiMock.fetchSensorDetail).not.toHaveBeenCalled();
  });

  it('starts in loading state when sensorId is provided', () => {
    techApiMock.fetchSensorDetail.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useSensorDetail('IR-CO1-MR02'));

    expect(result.current?.status).toBe('loading');
  });

  it('transitions to ok with sensor detail and logs on success', async () => {
    techApiMock.fetchSensorDetail.mockResolvedValueOnce(mockDetail);

    const { result } = renderHook(() => useSensorDetail('IR-CO1-MR02'));

    await waitFor(() => expect(result.current?.status).toBe('ok'));

    if (result.current?.status === 'ok') {
      expect(result.current.data.sensorId).toBe('IR-CO1-MR02');
      expect(result.current.data.logs).toHaveLength(2);
      expect(result.current.data.logs[0].severity).toBe('critical');
      expect(result.current.data.logs[0].resolvedAt).toBeNull();
      expect(result.current.data.logs[1].state).toBe('resolved');
    }
  });

  it('calls fetchSensorDetail with the correct sensorId', async () => {
    techApiMock.fetchSensorDetail.mockResolvedValueOnce(mockDetail);

    renderHook(() => useSensorDetail('IR-CO1-MR02'));

    await waitFor(() => expect(techApiMock.fetchSensorDetail).toHaveBeenCalledWith('IR-CO1-MR02'));
  });

  it('transitions to error state on API failure', async () => {
    techApiMock.fetchSensorDetail.mockRejectedValueOnce(new Error('Sensor não encontrado'));

    const { result } = renderHook(() => useSensorDetail('SENSOR-INVALID'));

    await waitFor(() => expect(result.current?.status).toBe('error'));

    if (result.current?.status === 'error') {
      expect(result.current.message).toBe('Sensor não encontrado');
    }
  });

  it('resets to null and refetches when sensorId changes to null', async () => {
    techApiMock.fetchSensorDetail.mockResolvedValueOnce(mockDetail);

    const { result, rerender } = renderHook(
      ({ id }: { id: string | null }) => useSensorDetail(id),
      { initialProps: { id: 'IR-CO1-MR02' as string | null } },
    );

    await waitFor(() => expect(result.current?.status).toBe('ok'));

    rerender({ id: null });

    expect(result.current).toBeNull();
  });

  it('refetches when sensorId changes', async () => {
    const detail2 = { ...mockDetail, sensorId: 'GW-CO1-01', logs: [] };
    techApiMock.fetchSensorDetail
      .mockResolvedValueOnce(mockDetail)
      .mockResolvedValueOnce(detail2);

    const { result, rerender } = renderHook(
      ({ id }: { id: string | null }) => useSensorDetail(id),
      { initialProps: { id: 'IR-CO1-MR02' as string | null } },
    );

    await waitFor(() => expect(result.current?.status).toBe('ok'));

    rerender({ id: 'GW-CO1-01' });

    await waitFor(() => {
      if (result.current?.status === 'ok') {
        expect(result.current.data.sensorId).toBe('GW-CO1-01');
      }
    });

    expect(techApiMock.fetchSensorDetail).toHaveBeenCalledTimes(2);
    expect(techApiMock.fetchSensorDetail).toHaveBeenNthCalledWith(2, 'GW-CO1-01');
  });
});
