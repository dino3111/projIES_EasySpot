import { useState, useEffect } from 'react';
import {
  computeTechKPIs,
  type SensorDevice,
  type SensorStatus,
  type MaintenanceOrder,
} from '../../data/technicianData';
import { type IssueReport } from '../../data/gestorData';
import { STATUS_LABEL, type PageTab, type StatusFil } from './components/maintenanceTypes';
import { TabBtn } from './components/shared';
import { IncidentsTab } from './components/IncidentsTab';
import { SensorsTab } from './components/SensorsTab';
import { TasksTab } from './components/TasksTab';
import { IssueDetailModal } from './components/IssueDetailModal';
import { SensorDiagPanel, StatusUpdateModal } from './components/SensorModals';
import { NewOrderModal, QuickTaskFromIssueModal } from './components/OrderModals';
import {
  fetchSensorList,
  fetchSensorDetail,
  fetchAlerts,
  updateSensorStatus,
  type SensorSummary,
} from '../../services/technicianApi';

const STATUS_TO_API: Record<string, string> = {
  operacional: 'operational',
  falha:       'degraded',
  offline:     'offline',
  manutencao:  'maintenance',
};

function toSensorStatus(apiStatus: string): SensorStatus {
  if (apiStatus === 'operational')  return 'operacional';
  if (apiStatus === 'offline')      return 'offline';
  if (apiStatus === 'maintenance')  return 'manutencao';
  return 'falha'; // degraded and anything else
}

function apiSensorToDevice(a: SensorSummary): SensorDevice {
  return {
    id: a.sensorId,
    tipo: 'IR' as const,
    parqueId: a.parkingLotId.toString(),
    parqueNome: a.parkingLotName,
    cidade: '',
    zona: a.zone,
    status: toSensorStatus(a.status),
    ultimaLeitura: a.lastSeenAt,
    uptimePercent: 0,
    taxaFalsosPositivos: 0,
    firmware: '—',
    instaladoEm: a.createdAt,
    ultimaManutencao: '—',
    historicoErros: [],
  };
}

export function MaintenancePage() {
  const [tab, setTab]                       = useState<PageTab>('ocorrencias');
  const [sensors, setSensors]               = useState<SensorDevice[]>([]);
  const [issues, setIssues]                 = useState<IssueReport[]>([]);
  const [orders, setOrders]                 = useState<MaintenanceOrder[]>([]);
  const [sensorError, setSensorError]       = useState<string | null>(null);
  const [issuesError, setIssuesError]       = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue]   = useState<IssueReport | null>(null);
  const [statusFil, setStatusFil]           = useState<StatusFil>('todos');
  const [selectedSensor, setSelectedSensor] = useState<SensorDevice | null>(null);
  const [logsLoading, setLogsLoading]       = useState(false);
  const [newOrderModal, setNewOrderModal]   = useState(false);
  const [issueForTask, setIssueForTask]     = useState<IssueReport | null>(null);
  const [updateTarget, setUpdateTarget]     = useState<SensorDevice | null>(null);
  const [toast, setToast]                   = useState<string | null>(null);

  useEffect(() => {
    fetchSensorList()
      .then((apiSensors) => setSensors(apiSensors.map(apiSensorToDevice)))
      .catch((err: unknown) => {
        setSensorError(err instanceof Error ? err.message : 'Erro ao carregar sensores.');
      });

    fetchAlerts()
      .then(setIssues)
      .catch((err: unknown) => {
        setIssuesError(err instanceof Error ? err.message : 'Erro ao carregar ocorrências.');
      });
  }, []);

  const kpis = computeTechKPIs(sensors);
  const filteredSensors = statusFil === 'todos' ? sensors : sensors.filter((s) => s.status === statusFil);
  const openOrders = orders.filter((o) => o.estado !== 'concluida').length;
  const openIssues = issues.filter((i) => i.estado === 'aberto').length;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const reloadSensors = () => {
    setSensorError(null);
    fetchSensorList()
      .then((apiSensors) => setSensors(apiSensors.map(apiSensorToDevice)))
      .catch((err: unknown) => setSensorError(err instanceof Error ? err.message : 'Erro'));
  };

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
      // silently keep empty error history
    } finally {
      setLogsLoading(false);
    }
  };

  const handleStatusUpdate = (sensorId: string, newStatus: SensorStatus, notes: string) => {
    const apiStatus = STATUS_TO_API[newStatus] ?? newStatus;
    updateSensorStatus(sensorId, apiStatus, notes || undefined).catch(() => {
      // optimistic update — API failure is silent
    });

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

      {sensorError && (
        <div
          role="alert"
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800"
          style={{ fontSize: '0.82rem' }}
        >
          <i className="fas fa-triangle-exclamation" aria-hidden="true" />
          <span>Sensores indisponíveis: {sensorError}</span>
          <button onClick={reloadSensors} className="ml-auto underline font-semibold">
            Tentar novamente
          </button>
        </div>
      )}

      {issuesError && (
        <div
          role="alert"
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800"
          style={{ fontSize: '0.82rem' }}
        >
          <i className="fas fa-triangle-exclamation" aria-hidden="true" />
          <span>Ocorrências indisponíveis: {issuesError}</span>
          <button
            onClick={() => {
              setIssuesError(null);
              fetchAlerts().then(setIssues).catch((err: unknown) => setIssuesError(err instanceof Error ? err.message : 'Erro'));
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
          issues={issues}
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
