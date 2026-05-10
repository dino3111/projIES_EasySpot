import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchTechnicianDashboard,
  fetchSensorList,
  fetchSensorDetail,
  updateAlertState,
} from '../technicianApi';

// Mock the shared apiService so we don't re-test its internals
const apiServiceMock = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../../services/apiService', () => apiServiceMock);

const mockDashboard = {
  kpis: { totalSensors: 10, operationalSensors: 8, uptimePct: 96.5, failuresToday: 2, failuresTodayVariancePct: 10, meanTimeToRepair: '2h 30m', mttrVariancePct: -5 },
  uptimeLast7Days: [{ date: '2026-05-01', day: 'Qui', uptimePct: 97.0 }],
  sensorDistribution: [{ status: 'operational', label: 'Operacional', count: 8, percentage: 80.0 }],
  urgentWorkOrders: [],
};

const mockSensors = [
  { sensorId: 'IR-AV1-B07', parkingLotId: 'park-1', parkingLotName: 'Fórum Aveiro', zone: 'Zona B', status: 'offline', lastSeenAt: '2026-05-08T10:00:00Z', createdAt: '2024-06-15T00:00:00Z' },
];

const mockDetail = {
  ...mockSensors[0],
  logs: [
    { alertId: 'alert-1', type: 'sensor', severity: 'critical', state: 'open', description: 'Falha de leitura', createdAt: '2026-05-08T09:00:00Z', resolvedAt: null },
  ],
};

describe('technicianApi', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('fetchTechnicianDashboard', () => {
    it('calls request with correct path and returns dashboard', async () => {
      apiServiceMock.request.mockResolvedValueOnce(mockDashboard);

      const result = await fetchTechnicianDashboard();

      expect(apiServiceMock.request).toHaveBeenCalledWith('/api/technician/dashboard');
      expect(result.kpis.totalSensors).toBe(10);
    });

    it('propagates errors from request', async () => {
      apiServiceMock.request.mockRejectedValueOnce(new Error('Sessão expirada'));

      await expect(fetchTechnicianDashboard()).rejects.toThrow('Sessão expirada');
    });
  });

  describe('fetchSensorList', () => {
    it('calls request with correct path', async () => {
      apiServiceMock.request.mockResolvedValueOnce(mockSensors);

      const result = await fetchSensorList();

      expect(apiServiceMock.request).toHaveBeenCalledWith('/api/technician/sensors');
      expect(result[0].sensorId).toBe('IR-AV1-B07');
    });
  });

  describe('fetchSensorDetail', () => {
    it('calls request with encoded sensorId', async () => {
      apiServiceMock.request.mockResolvedValueOnce(mockDetail);

      const result = await fetchSensorDetail('IR-AV1-B07');

      expect(apiServiceMock.request).toHaveBeenCalledWith('/api/technician/sensors/IR-AV1-B07/logs');
      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].severity).toBe('critical');
    });

    it('encodes special characters in sensorId', async () => {
      apiServiceMock.request.mockResolvedValueOnce({ ...mockDetail, sensorId: 'IR AV1/B07', logs: [] });

      await fetchSensorDetail('IR AV1/B07');

      expect(apiServiceMock.request).toHaveBeenCalledWith('/api/technician/sensors/IR%20AV1%2FB07/logs');
    });
  });

  describe('updateAlertState', () => {
    it('calls request with PATCH method and state body', async () => {
      apiServiceMock.request.mockResolvedValueOnce(undefined);

      await updateAlertState('alert-uuid-123', 'IN_PROGRESS');

      expect(apiServiceMock.request).toHaveBeenCalledWith(
        '/api/alerts/alert-uuid-123/state',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ state: 'IN_PROGRESS' }),
        }),
      );
    });
  });
});
