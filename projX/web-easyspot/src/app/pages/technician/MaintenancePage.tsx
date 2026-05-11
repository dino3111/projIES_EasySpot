import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { type SensorDevice, type SensorStatus, computeTechKPIs } from '../../data/technicianData';
import { STATUS_LABEL, type PageTab, type StatusFil } from './components/maintenanceTypes';
import { TabBtn } from './components/shared';
import { IncidentsTab } from './components/IncidentsTab';
import { SensorsTab } from './components/SensorsTab';
import { TasksTab } from './components/TasksTab';
import { IssueDetailModal } from './components/IssueDetailModal';
import { SensorDiagPanel, StatusUpdateModal } from './components/SensorModals';
import { NewOrderModal } from './components/OrderModals';
import {
  fetchSensorList,
  fetchSensorDetail,
  fetchAlerts,
  updateAlertState,
  updateSensorStatus,
  type SensorSummary,
  type AlertResponse,
  type WorkOrder,
} from '../../services/technicianApi';

const STATUS_TO_API: Record<string, string> = {
  operacional: 'operational',
  falha:       'degraded',
  offline:     'offline',
  manutencao:  'maintenance',
};

// ── Sensor mapping (API → UI) ─────────────────────────────────────────────────

function toSensorStatus(apiStatus: string): SensorStatus {
  if (apiStatus === 'operational') return 'operacional';
  if (apiStatus === 'offline')     return 'offline';
  if (apiStatus === 'degraded')    return 'falha';
  return 'offline';
}

function sensorFromApi(a: SensorSummary): SensorDevice {
  return {
    id: a.sensorId,
    tipo: 'IR' as const,
    parqueId: a.parkingLotId,
    parqueNome: a.parkingLotName,
    cidade: a.parkingLotCity ?? '',
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

// ── Alert → IssueReport mapping (API → UI) ────────────────────────────────────

function toIssueEstado(state: AlertResponse['state']): 'aberto' | 'em-progresso' | 'resolvido' {
  if (state === 'IN_PROGRESS') return 'em-progresso';
  if (state === 'RESOLVED')    return 'resolvido';
  return 'aberto';
}

function toIssueSeveridade(severity: AlertResponse['severity']): 'critica' | 'aviso' | 'info' {
  if (severity === 'CRITICAL') return 'critica';
  if (severity === 'WARNING')  return 'aviso';
  return 'info';
}

function toIssueTipo(type: AlertResponse['type']): 'sensor' | 'cliente' | 'sistema' {
  if (type === 'CLIENT') return 'cliente';
  if (type === 'SYSTEM') return 'sistema';
  return 'sensor';
}

export interface IssueReport {
  id: string;
  tipo: 'sensor' | 'cliente' | 'sistema';
  parque: string;
  zona?: string;
  sensorId?: string;
  matricula?: string;
  descricao: string;
  severidade: 'critica' | 'aviso' | 'info';
  estado: 'aberto' | 'em-progresso' | 'resolvido';
  criadoEm: string;
  atribuidoA?: string;
  notas?: string;
}

function alertToIssue(a: AlertResponse): IssueReport {
  return {
    id: a.id,
    tipo: toIssueTipo(a.type),
    parque: a.park,
    zona: a.zone ?? undefined,
    sensorId: a.sensorId ?? undefined,
    matricula: a.plate ?? undefined,
    descricao: a.description,
    severidade: toIssueSeveridade(a.severity),
    estado: toIssueEstado(a.state),
    criadoEm: a.createdAt,
    atribuidoA: a.attributedTo ?? undefined,
    notas: a.notes ?? undefined,
  };
}

function alertToWorkOrder(a: AlertResponse): WorkOrder {
  return {
    id: a.id,
    type: a.type,
    park: a.park,
    zone: a.zone ?? '',
    sensorId: a.sensorId,
    description: a.description,
    severity: a.severity,
    state: a.state,
    createdAt: a.createdAt,
    attributedTo: a.attributedTo,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

const TAB_PARAM_MAP: Record<string, PageTab> = {
  tasks: 'tarefas',
  sensors: 'sensores',
  incidents: 'ocorrencias',
};

export function MaintenancePage() {
  const [searchParams] = useSearchParams();
  const initialTab = TAB_PARAM_MAP[searchParams.get('tab') ?? ''] ?? 'ocorrencias';
  const [tab, setTab]                       = useState<PageTab>(initialTab);
  const [sensors, setSensors]               = useState<SensorDevice[]>([]);
  const [issues, setIssues]                 = useState<IssueReport[]>([]);
  const [orders, setOrders]                 = useState<WorkOrder[]>([]);
  const [loading, setLoading]               = useState(true);
  const [apiError, setApiError]             = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue]   = useState<IssueReport | null>(null);
  const [statusFil, setStatusFil]           = useState<StatusFil>('todos');
  const [selectedSensor, setSelectedSensor] = useState<SensorDevice | null>(null);
  const [logsLoading, setLogsLoading]       = useState(false);
  const [newOrderModal, setNewOrderModal]   = useState(false);
  const [updateTarget, setUpdateTarget]     = useState<SensorDevice | null>(null);
  const [toast, setToast]                   = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const [apiSensors, apiAlerts] = await Promise.all([
        fetchSensorList(),
        fetchAlerts(),
      ]);
      setSensors(apiSensors.map(sensorFromApi));
      const techAlerts = apiAlerts.filter(a => a.type === 'SENSOR' || a.type === 'SYSTEM');
      setIssues(techAlerts.map(alertToIssue));
      setOrders(apiAlerts.map(alertToWorkOrder));
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const kpis = computeTechKPIs(sensors);
  const filteredSensors = statusFil === 'todos' ? sensors : sensors.filter((s) => s.status === statusFil);
  const openIssues = issues.filter((i) => i.estado === 'aberto').length;
  const openOrders = orders.filter((o) => o.state !== 'RESOLVED').length;

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
      const enriched = { ...sensor, historicoErros: realLogs.length > 0 ? realLogs : sensor.historicoErros };
      setSensors((prev) => prev.map((s) => s.id === sensor.id ? enriched : s));
      setSelectedSensor(enriched);
    } catch {
      // fallback: keep sensor as-is
    } finally {
      setLogsLoading(false);
    }
  };

  const handleIssueStateUpdate = async (issueId: string, newState: 'IN_PROGRESS' | 'RESOLVED') => {
    try {
      await updateAlertState(issueId, newState);
      setIssues((prev) => prev.map((i) =>
        i.id === issueId ? { ...i, estado: toIssueEstado(newState) } : i,
      ));
      setOrders((prev) => prev.map((o) =>
        o.id === issueId ? { ...o, state: newState } : o,
      ));
      showToast(newState === 'IN_PROGRESS' ? 'Ocorrência em progresso.' : 'Ocorrência resolvida.');
    } catch {
      showToast('Erro ao atualizar estado.');
    }
  };

  const handleOrderUpdate = async (orderId: string, novoEstado: 'em-progresso' | 'concluida') => {
    const apiState = novoEstado === 'em-progresso' ? 'IN_PROGRESS' : 'RESOLVED';
    try {
      await updateAlertState(orderId, apiState);
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, state: apiState } : o));
      setIssues((prev) => prev.map((i) =>
        i.id === orderId ? { ...i, estado: toIssueEstado(apiState) } : i,
      ));
      showToast(novoEstado === 'em-progresso' ? 'Tarefa iniciada.' : 'Tarefa concluída.');
    } catch {
      showToast('Erro ao atualizar tarefa.');
    }
  };

  const handleStatusUpdate = async (sensorId: string, newStatus: SensorStatus, notes: string) => {
    const apiStatus = STATUS_TO_API[newStatus] ?? newStatus;
    await updateSensorStatus(sensorId, apiStatus, notes || undefined).catch(() => {});
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
    setUpdateTarget(null);
    setSelectedSensor(null);
    setSelectedIssue(null);
    showToast(`Sensor ${sensorId} atualizado para "${STATUS_LABEL[newStatus]}".`);
  };

  const handleCreateOrder = async (sensorId: string, titulo: string, descricao: string, _prioridade: string) => {
    const alert = orders.find((o) => o.sensorId === sensorId && o.state === 'OPEN');
    if (alert) {
      try {
        await updateAlertState(alert.id, 'IN_PROGRESS', descricao || undefined);
        setOrders((prev) => prev.map((o) => o.id === alert.id ? { ...o, state: 'IN_PROGRESS' } : o));
        setIssues((prev) => prev.map((i) => i.id === alert.id ? { ...i, estado: 'em-progresso' } : i));
        showToast(`Tarefa "${titulo}" criada — sensor ${sensorId} em progresso.`);
      } catch {
        showToast('Erro ao criar tarefa.');
      }
    } else {
      showToast(`Não foi possível criar a tarefa "${titulo}": não existe nenhum alerta aberto para o sensor ${sensorId}.`);
    }
    setNewOrderModal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <i className="fas fa-spinner fa-spin text-primary text-2xl" aria-hidden="true" />
      </div>
    );
  }

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
          <span>Erro ao carregar dados: {apiError}</span>
          <button onClick={loadAll} className="ml-auto underline font-semibold">
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
          onCreateTaskFromIssue={(issue) => {
            handleIssueStateUpdate(issue.id, 'IN_PROGRESS');
          }}
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
          onUpdate={handleOrderUpdate}
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
          onCreate={handleCreateOrder}
        />
      )}
    </div>
  );
}
