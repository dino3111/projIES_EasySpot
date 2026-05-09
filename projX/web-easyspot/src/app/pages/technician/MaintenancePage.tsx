import { useState, useEffect } from 'react';
import {
  mockSensors,
  mockMaintenanceOrders,
  computeTechKPIs,
  type SensorDevice,
  type SensorStatus,
  type MaintenanceOrder,
} from '../../data/technicianData';
import { type IssueReport } from '../../data/gestorData';
import { STATUS_LABEL, techIssues, type PageTab, type StatusFil } from './components/maintenanceTypes';
import { TabBtn } from './components/shared';
import { IncidentsTab } from './components/IncidentsTab';
import { SensorsTab } from './components/SensorsTab';
import { TasksTab } from './components/TasksTab';
import { IssueDetailModal } from './components/IssueDetailModal';
import { SensorDiagPanel, StatusUpdateModal } from './components/SensorModals';
import { NewOrderModal, QuickTaskFromIssueModal } from './components/OrderModals';
import { fetchSensorList, fetchSensorDetail, type SensorSummary } from '../../services/technicianApi';

function toSensorStatus(apiStatus: string, fallback: SensorStatus): SensorStatus {
  if (apiStatus === 'operational') return 'operacional';
  if (apiStatus === 'offline')     return 'offline';
  if (apiStatus === 'degraded')    return 'falha';
  return fallback;
}

function mergeSensorStatus(
  locals: SensorDevice[],
  apiSensors: SensorSummary[],
): SensorDevice[] {
  const localIds = new Set(locals.map((s) => s.id));

  // Update status of sensors that exist in the mock
  const updated = locals.map((s) => {
    const api = apiSensors.find((a) => a.sensorId === s.id);
    if (!api) return s;
    return { ...s, status: toSensorStatus(api.status, s.status), ultimaLeitura: api.lastSeenAt };
  });

  // Add sensors from the API that don't exist in the mock
  const newFromApi: SensorDevice[] = apiSensors
    .filter((a) => !localIds.has(a.sensorId))
    .map((a) => ({
      id: a.sensorId,
      tipo: 'IR' as const,
      parqueId: a.parkingLotId.toString(),
      parqueNome: a.parkingLotName,
      cidade: '',
      zona: a.zone,
      status: toSensorStatus(a.status, 'offline'),
      ultimaLeitura: a.lastSeenAt,
      uptimePercent: 0,
      taxaFalsosPositivos: 0,
      firmware: '—',
      instaladoEm: a.createdAt,
      ultimaManutencao: '—',
      historicoErros: [],
    }));

  return [...updated, ...newFromApi];
}

export function MaintenancePage() {
  const [tab, setTab]                       = useState<PageTab>('ocorrencias');
  const [sensors, setSensors]               = useState<SensorDevice[]>([]);
  const [orders, setOrders]                 = useState<MaintenanceOrder[]>(mockMaintenanceOrders);
  const [apiError, setApiError]             = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue]   = useState<IssueReport | null>(null);
  const [statusFil, setStatusFil]           = useState<StatusFil>('todos');
  const [selectedSensor, setSelectedSensor] = useState<SensorDevice | null>(null);
  const [logsLoading, setLogsLoading]       = useState(false);
  const [newOrderModal, setNewOrderModal]   = useState(false);
  const [issueForTask, setIssueForTask]     = useState<IssueReport | null>(null);
  const [updateTarget, setUpdateTarget]     = useState<SensorDevice | null>(null);
  const [toast, setToast]                   = useState<string | null>(null);

  // Load real sensor statuses from API on mount
  useEffect(() => {
    fetchSensorList()
      .then((apiSensors) => setSensors((prev) => mergeSensorStatus(prev, apiSensors)))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Erro ao carregar sensores da API.';
        setApiError(msg);
      });
  }, []);

  const kpis = computeTechKPIs(sensors);
  const filteredSensors = statusFil === 'todos' ? sensors : sensors.filter((s) => s.status === statusFil);
  const openOrders = orders.filter((o) => o.estado !== 'concluida').length;
  const openIssues = techIssues.filter((i) => i.estado === 'aberto').length;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // When opening a sensor, enrich its error history with real API logs
  const handleSelectSensor = async (sensor: SensorDevice) => {
    setLogsLoading(true);
    setSelectedSensor(sensor);
    try {
      const detail = await fetchSensorDetail(sensor.id);
      const realLogs = detail.logs.map((l) => ({
        id: l.alertId,
        timestamp: l.createdAt,
        codigo: l.type.toUpperCase(),
        descricao: l.description,
        resolvido: l.state === 'resolved',
      }));
      setSensors((prev) =>
        prev.map((s) =>
          s.id === sensor.id
            ? { ...s, historicoErros: realLogs.length > 0 ? realLogs : s.historicoErros }
            : s,
        ),
      );
      setSelectedSensor((prev) =>
        prev?.id === sensor.id
          ? { ...prev, historicoErros: realLogs.length > 0 ? realLogs : prev.historicoErros }
          : prev,
      );
    } catch {
      // silently fallback to mock logs
    } finally {
      setLogsLoading(false);
    }
  };

  const handleStatusUpdate = (sensorId: string, newStatus: SensorStatus, notes: string) => {
    setSensors((prev) =>
      prev.map((s) => {
        if (s.id !== sensorId) return s;
        const entry = {
          id: `upd-${Date.now()}`,
          timestamp: new Date().toISOString(),
          codigo: 'INFO_STATUS_UPDATED',
          descricao: `Estado atualizado para "${STATUS_LABEL[newStatus]}" pelo técnico.${notes ? ` Notas: ${notes}` : ''}`,
          resolvido: true,
        };
        return { ...s, status: newStatus, historicoErros: [entry, ...s.historicoErros] };
      }),
    );
    if (newStatus === 'operacional') {
      setOrders((prev) =>
        prev.map((o) =>
          o.sensorId === sensorId && o.estado !== 'concluida' ? { ...o, estado: 'concluida' as const } : o,
        ),
      );
    }
    setUpdateTarget(null);
    setSelectedSensor(null);
    setSelectedIssue(null);
    showToast(`Sensor ${sensorId} atualizado para "${STATUS_LABEL[newStatus]}".`);
  };

  return (
    <div className="px-4 py-5 max-w-screen-xl mx-auto space-y-5">

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-green-600 text-white shadow-xl"
          style={{ fontSize: '0.85rem', fontWeight: 600 }}
        >
          <i className="fas fa-circle-check" aria-hidden="true" />
          {toast}
        </div>
      )}

      {apiError && (
        <div
          role="alert"
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800"
          style={{ fontSize: '0.82rem' }}
        >
          <i className="fas fa-triangle-exclamation" aria-hidden="true" />
          <span>Dados parciais: {apiError} — a usar dados locais.</span>
          <button
            onClick={() => {
              setApiError(null);
              fetchSensorList()
                .then((apiSensors) => setSensors((prev) => mergeSensorStatus(prev, apiSensors)))
                .catch((err: unknown) => setApiError(err instanceof Error ? err.message : 'Erro'));
            }}
            className="ml-auto underline font-semibold"
          >
            Tentar novamente
          </button>
        </div>
      )}

      <div>
        <h1 className="text-foreground" style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.2 }}>
          Diagnóstico &amp; Manutenção
        </h1>
        <p className="text-muted-foreground mt-1" style={{ fontSize: '0.875rem' }}>
          Ocorrências · Sensores · Tarefas de reparação
        </p>
      </div>

      <div role="tablist" aria-label="Secções de manutenção" className="flex gap-0 bg-muted rounded-xl p-1 w-full sm:inline-flex">
        <TabBtn active={tab === 'ocorrencias'} onClick={() => setTab('ocorrencias')} icon="fa-triangle-exclamation" label="Ocorrências" badge={openIssues} />
        <TabBtn active={tab === 'sensores'}    onClick={() => setTab('sensores')}    icon="fa-microchip"           label="Sensores"    badge={kpis.emFalha + kpis.offline} />
        <TabBtn active={tab === 'tarefas'}     onClick={() => setTab('tarefas')}     icon="fa-list-check"          label="Tarefas"     badge={openOrders} />
      </div>

      {tab === 'ocorrencias' && (
        <IncidentsTab
          sensors={sensors}
          onSelectIssue={setSelectedIssue}
          onUpdateSensor={setUpdateTarget}
          onCreateTaskFromIssue={setIssueForTask}
        />
      )}
      {tab === 'sensores' && (
        <SensorsTab
          sensors={filteredSensors}
          statusFil={statusFil}
          setStatusFil={setStatusFil}
          onSelect={handleSelectSensor}
          kpis={kpis}
        />
      )}
      {tab === 'tarefas' && (
        <TasksTab
          orders={orders}
          sensors={sensors}
          onUpdate={(orderId, novoEstado) => {
            setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, estado: novoEstado } : o));
            showToast(novoEstado === 'em-progresso' ? 'Tarefa iniciada.' : 'Tarefa concluída.');
          }}
          onNewOrder={() => setNewOrderModal(true)}
        />
      )}

      {selectedIssue && (
        <IssueDetailModal
          issue={selectedIssue}
          sensor={sensors.find((s) => s.id === selectedIssue.sensorId) ?? null}
          onClose={() => setSelectedIssue(null)}
          onUpdateSensor={(sensor) => { setUpdateTarget(sensor); setSelectedIssue(null); }}
        />
      )}
      {selectedSensor && (
        <SensorDiagPanel
          sensor={selectedSensor}
          onClose={() => setSelectedSensor(null)}
          onUpdate={() => setUpdateTarget(selectedSensor)}
        />
      )}
      {logsLoading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="bg-card rounded-2xl px-6 py-4 flex items-center gap-3 shadow-xl">
            <i className="fas fa-spinner fa-spin text-primary" aria-hidden="true" />
            <span className="text-foreground" style={{ fontSize: '0.88rem', fontWeight: 600 }}>A carregar logs do sensor…</span>
          </div>
        </div>
      )}
      {updateTarget && (
        <StatusUpdateModal
          sensor={updateTarget}
          onClose={() => setUpdateTarget(null)}
          onConfirm={handleStatusUpdate}
        />
      )}
      {newOrderModal && (
        <NewOrderModal
          sensors={sensors.filter((s) => s.status !== 'operacional')}
          onClose={() => setNewOrderModal(false)}
          onCreate={(order) => {
            setOrders((prev) => [order, ...prev]);
            setNewOrderModal(false);
            showToast('Ordem de manutenção criada com sucesso.');
          }}
        />
      )}
      {issueForTask && (
        <QuickTaskFromIssueModal
          issue={issueForTask}
          sensors={sensors.filter((s) => s.id === issueForTask.sensorId)}
          onClose={() => setIssueForTask(null)}
          onCreate={(order) => {
            setOrders((prev) => [order, ...prev]);
            setIssueForTask(null);
            showToast('Tarefa de manutenção criada com sucesso.');
          }}
        />
      )}
    </div>
  );
}
