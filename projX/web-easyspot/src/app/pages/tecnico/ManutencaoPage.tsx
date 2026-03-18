import { useState } from 'react';
import {
  mockSensors,
  mockMaintenanceOrders,
  computeTechKPIs,
  type SensorDevice,
  type SensorStatus,
  type MaintenanceOrder,
} from '../../data/technicianData';
import { type IssueReport } from '../../data/gestorData';
import { STATUS_LABEL, techIssues, type PageTab, type StatusFil } from './components/manutencaoTypes';
import { TabBtn } from './components/shared';
import { OcorrenciasTab } from './components/OcorrenciasTab';
import { SensoresTab } from './components/SensoresTab';
import { TarefasTab } from './components/TarefasTab';
import { IssueDetailModal } from './components/IssueDetailModal';
import { SensorDiagPanel, StatusUpdateModal } from './components/SensorModals';
import { NewOrderModal, QuickTaskFromIssueModal } from './components/OrderModals';

export function ManutencaoPage() {
  const [tab, setTab]                   = useState<PageTab>('ocorrencias');
  const [sensors, setSensors]           = useState<SensorDevice[]>(mockSensors);
  const [orders, setOrders]             = useState<MaintenanceOrder[]>(mockMaintenanceOrders);
  const [selectedIssue, setSelectedIssue] = useState<IssueReport | null>(null);
  const [statusFil, setStatusFil]       = useState<StatusFil>('todos');
  const [selectedSensor, setSelectedSensor] = useState<SensorDevice | null>(null);
  const [newOrderModal, setNewOrderModal] = useState(false);
  const [issueForTask, setIssueForTask] = useState<IssueReport | null>(null);
  const [updateTarget, setUpdateTarget] = useState<SensorDevice | null>(null);
  const [toast, setToast]               = useState<string | null>(null);

  const kpis = computeTechKPIs(sensors);
  const filteredSensors = statusFil === 'todos' ? sensors : sensors.filter(s => s.status === statusFil);
  const openOrders = orders.filter(o => o.estado !== 'concluida').length;
  const openIssues = techIssues.filter(i => i.estado === 'aberto').length;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleStatusUpdate = (sensorId: string, newStatus: SensorStatus, notes: string) => {
    setSensors(prev => prev.map(s => {
      if (s.id !== sensorId) return s;
      const entry = {
        id: `upd-${Date.now()}`,
        timestamp: new Date().toISOString(),
        codigo: 'INFO_STATUS_UPDATED',
        descricao: `Estado atualizado para "${STATUS_LABEL[newStatus]}" pelo técnico.${notes ? ` Notas: ${notes}` : ''}`,
        resolvido: true,
      };
      return { ...s, status: newStatus, historicoErros: [entry, ...s.historicoErros] };
    }));
    if (newStatus === 'operacional') {
      setOrders(prev => prev.map(o =>
        o.sensorId === sensorId && o.estado !== 'concluida' ? { ...o, estado: 'concluida' as const } : o
      ));
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
          <i className="fas fa-circle-check" aria-hidden="true"></i>
          {toast}
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
        <OcorrenciasTab
          sensors={sensors}
          onSelectIssue={setSelectedIssue}
          onUpdateSensor={setUpdateTarget}
          onCreateTaskFromIssue={setIssueForTask}
        />
      )}
      {tab === 'sensores' && (
        <SensoresTab
          sensors={filteredSensors}
          statusFil={statusFil}
          setStatusFil={setStatusFil}
          onSelect={setSelectedSensor}
          kpis={kpis}
        />
      )}
      {tab === 'tarefas' && (
        <TarefasTab
          orders={orders}
          sensors={sensors}
          onUpdate={(orderId, novoEstado) => {
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, estado: novoEstado } : o));
            showToast(novoEstado === 'em-progresso' ? 'Tarefa iniciada.' : 'Tarefa concluída.');
          }}
          onNewOrder={() => setNewOrderModal(true)}
        />
      )}

      {selectedIssue && (
        <IssueDetailModal
          issue={selectedIssue}
          sensor={sensors.find(s => s.id === selectedIssue.sensorId) ?? null}
          onClose={() => setSelectedIssue(null)}
          onUpdateSensor={sensor => { setUpdateTarget(sensor); setSelectedIssue(null); }}
        />
      )}
      {selectedSensor && (
        <SensorDiagPanel
          sensor={selectedSensor}
          onClose={() => setSelectedSensor(null)}
          onUpdate={() => setUpdateTarget(selectedSensor)}
        />
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
          sensors={sensors.filter(s => s.status !== 'operacional')}
          onClose={() => setNewOrderModal(false)}
          onCreate={order => {
            setOrders(prev => [order, ...prev]);
            setNewOrderModal(false);
            showToast('Ordem de manutenção criada com sucesso.');
          }}
        />
      )}
      {issueForTask && (
        <QuickTaskFromIssueModal
          issue={issueForTask}
          sensors={sensors.filter(s => s.id === issueForTask.sensorId)}
          onClose={() => setIssueForTask(null)}
          onCreate={order => {
            setOrders(prev => [order, ...prev]);
            setIssueForTask(null);
            showToast('Tarefa de manutenção criada com sucesso.');
          }}
        />
      )}
    </div>
  );
}
