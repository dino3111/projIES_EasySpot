import { useState } from 'react';
import {
  mockSensors,
  mockMaintenanceOrders,
  computeTechKPIs,
  type SensorDevice,
  type SensorStatus,
  type MaintenanceOrder,
} from '../../data/technicianData';
import {
  mockIssues,
  type IssueReport,
} from '../../data/gestorData';
import {
  mockParkingLots,
  type ParkingSpot,
} from '../../data/parkingData';

// ─── Helpers de estilo ────────────────────────────────────────────────────────
const STATUS_COLOR: Record<SensorStatus, string> = {
  operacional: '#22c55e',
  falha:       '#d4183d',
  offline:     '#6b7280',
  manutencao:  '#f59e0b',
};
const STATUS_LABEL: Record<SensorStatus, string> = {
  operacional: 'Operacional',
  falha:       'Falha',
  offline:     'Offline',
  manutencao:  'Manutenção',
};
const STATUS_ICON: Record<SensorStatus, string> = {
  operacional: 'fa-circle-check',
  falha:       'fa-circle-xmark',
  offline:     'fa-circle-minus',
  manutencao:  'fa-wrench',
};
const TIPO_ICON: Record<string, string> = {
  IR:      'fa-microchip',
  RFID:    'fa-wifi',
  OCR:     'fa-camera',
  EV:      'fa-bolt',
  Gateway: 'fa-network-wired',
};
const PRIO_COLOR: Record<string, string> = {
  critica: '#d4183d',
  alta:    '#f59e0b',
  media:   '#3b82f6',
  baixa:   '#6b7280',
};
const PRIO_LABEL: Record<string, string> = {
  critica: 'Crítica',
  alta:    'Alta',
  media:   'Média',
  baixa:   'Baixa',
};

type PageTab = 'ocorrencias' | 'sensores' | 'tarefas';
type StatusFil = 'todos' | SensorStatus;

// ─── Issues técnicas (sensor + sistema) ──────────────────────────────────────
const techIssues = mockIssues.filter(i => i.tipo === 'sensor' || i.tipo === 'sistema');

// ─── Dados dos Gerentes de Parques ────────────────────────────────────────────
interface ParkManager {
  parkId: string;
  parkName: string;
  managerName: string;
  email: string;
  phone: string;
}

const parkManagers: ParkManager[] = [
  {
    parkId: 'coimbra-1',
    parkName: 'Estádio Cidade de Coimbra',
    managerName: 'Dr. João Silva',
    email: 'joao.silva@estadio-coimbra.pt',
    phone: '+351 239 800 001',
  },
  {
    parkId: 'coimbra-2',
    parkName: 'CoimbraShopping',
    managerName: 'Dra. Maria Santos',
    email: 'maria.santos@coimbrashopping.pt',
    phone: '+351 239 800 011',
  },
  {
    parkId: 'aveiro-1',
    parkName: 'Fórum Aveiro',
    managerName: 'Eng. Carlos Mendes',
    email: 'carlos.mendes@forum-aveiro.pt',
    phone: '+351 234 123 456',
  },
  {
    parkId: 'aveiro-2',
    parkName: 'Glicínias Plaza',
    managerName: 'Dra. Helena Costa',
    email: 'helena.costa@gliciniasplaza.pt',
    phone: '+351 234 234 567',
  },
  {
    parkId: 'leiria-1',
    parkName: 'Europa – Leiria',
    managerName: 'Eng. Ricardo Oliveira',
    email: 'ricardo.oliveira@europa-leiria.pt',
    phone: '+351 244 800 100',
  },
  {
    parkId: 'leiria-2',
    parkName: 'CentroLeiriaShopping',
    managerName: 'Dr. Nuno Ferreira',
    email: 'nuno.ferreira@centroleiria.pt',
    phone: '+351 244 800 111',
  },
];

export function ManutencaoPage() {
  const [tab, setTab] = useState<PageTab>('ocorrencias');
  const [sensors, setSensors] = useState<SensorDevice[]>(mockSensors);
  const [orders, setOrders]   = useState<MaintenanceOrder[]>(mockMaintenanceOrders);

  // Issue dialog state
  const [selectedIssue, setSelectedIssue] = useState<IssueReport | null>(null);

  // Sensor filters & detail panel
  const [statusFil, setStatusFil] = useState<StatusFil>('todos');
  const [selectedSensor, setSelectedSensor] = useState<SensorDevice | null>(null);

  const [newOrderModal, setNewOrderModal] = useState(false);
  
  // Create task from issue
  const [issueForTask, setIssueForTask] = useState<IssueReport | null>(null);

  // Status update modal
  const [updateTarget, setUpdateTarget] = useState<SensorDevice | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const kpis = computeTechKPIs(sensors);

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
    // Also close any open order for this sensor if marking as operacional
    if (newStatus === 'operacional') {
      setOrders(prev => prev.map(o =>
        o.sensorId === sensorId && o.estado !== 'concluida'
          ? { ...o, estado: 'concluida' as const }
          : o
      ));
    }
    setUpdateTarget(null);
    setSelectedSensor(null);
    setSelectedIssue(null);
    setToast(`Sensor ${sensorId} atualizado para "${STATUS_LABEL[newStatus]}".`);
    setTimeout(() => setToast(null), 4000);
  };

  const filteredSensors = statusFil === 'todos'
    ? sensors
    : sensors.filter(s => s.status === statusFil);

  const openOrders  = orders.filter(o => o.estado !== 'concluida').length;
  const openIssues  = techIssues.filter(i => i.estado === 'aberto').length;

  return (
    <div className="px-4 py-5 max-w-screen-xl mx-auto space-y-5">

      {/* ── Toast ──────────────────────────────────────────────────────── */}
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

      {/* ── Cabeçalho ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-foreground" style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.2 }}>
            Diagnóstico &amp; Manutenção
          </h1>
          <p className="text-muted-foreground mt-1" style={{ fontSize: '0.875rem' }}>
            Ocorrências · Sensores · Tarefas de reparação
          </p>
        </div>

      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Secções de manutenção"
        className="flex gap-0 bg-muted rounded-xl p-1 w-full sm:inline-flex"
      >
        <TabBtn active={tab === 'ocorrencias'} onClick={() => setTab('ocorrencias')} icon="fa-triangle-exclamation" label="Ocorrências" badge={openIssues} />
        <TabBtn active={tab === 'sensores'}    onClick={() => setTab('sensores')}    icon="fa-microchip"           label="Sensores"    badge={kpis.emFalha + kpis.offline} />
        <TabBtn active={tab === 'tarefas'}     onClick={() => setTab('tarefas')}     icon="fa-list-check"          label="Tarefas"     badge={openOrders} />
      </div>

      {/* ── Ocorrências ───────────────────────────────────────────────── */}
      {tab === 'ocorrencias' && (
        <OcorrenciasTab
          sensors={sensors}
          onSelectIssue={setSelectedIssue}
          onUpdateSensor={setUpdateTarget}
          onCreateTaskFromIssue={setIssueForTask}
        />
      )}

      {/* ── Sensores ──────────────────────────────────────────────────── */}
      {tab === 'sensores' && (
        <SensoresTab
          sensors={filteredSensors}
          statusFil={statusFil}
          setStatusFil={setStatusFil}
          onSelect={setSelectedSensor}
          kpis={kpis}
        />
      )}

      {/* ── Tarefas ────────────────────────────────────────────────────── */}
      {tab === 'tarefas' && (
        <TarefasTab
          orders={orders}
          sensors={sensors}
          onUpdate={(orderId, novoEstado) => {
            setOrders(prev => prev.map(o =>
              o.id === orderId ? { ...o, estado: novoEstado } : o
            ));
            const msg = novoEstado === 'em-progresso' ? 'Tarefa iniciada.' : 'Tarefa concluída.';
            setToast(msg);
            setTimeout(() => setToast(null), 3000);
          }}
          onNewOrder={() => setNewOrderModal(true)}
        />
      )}

      {/* ── Dialogs ───────────────────────────────────────────────────── */}
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
          onCreate={(order) => {
            setOrders(prev => [order, ...prev]);
            setNewOrderModal(false);
            setToast('Ordem de manutenção criada com sucesso.');
            setTimeout(() => setToast(null), 3000);
          }}
        />
      )}
      {issueForTask && (
        <QuickTaskFromIssueModal
          issue={issueForTask}
          sensors={sensors.filter(s => s.id === issueForTask.sensorId)}
          onClose={() => setIssueForTask(null)}
          onCreate={(order) => {
            setOrders(prev => [order, ...prev]);
            setIssueForTask(null);
            setToast('Tarefa de manutenção criada com sucesso.');
            setTimeout(() => setToast(null), 3000);
          }}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TAB: OCORRÊNCIAS (US#12)
// ────────────────────────────────────────────────────────────────────────────
function OcorrenciasTab({
  sensors,
  onSelectIssue,
  onUpdateSensor,
  onCreateTaskFromIssue,
}: {
  sensors: SensorDevice[];
  onSelectIssue: (i: IssueReport) => void;
  onUpdateSensor: (s: SensorDevice) => void;
  onCreateTaskFromIssue: (i: IssueReport) => void;
}) {
  const [estFilter, setEstFilter] = useState<'todos' | 'aberto' | 'em-progresso' | 'resolvido'>('todos');
  const [sevFilter, setSevFilter] = useState<'todos' | 'critica' | 'aviso'>('todos');
  const [cidadeFilter, setCidadeFilter] = useState<'todas' | string>('todas');
  const [selectedPark, setSelectedPark] = useState<string | null>(null);

  // Mapa de parques para cidades usando sensores como fonte
  const parkCityMap = new Map<string, string>();
  mockSensors.forEach(s => {
    if (!parkCityMap.has(s.parqueNome)) {
      parkCityMap.set(s.parqueNome, s.cidade);
    }
  });

  // Get unique parks from techIssues
  const parkNames = Array.from(new Set(techIssues.map(i => i.parque)));
  const parkIssuesMap = new Map<string, IssueReport[]>();
  parkNames.forEach(parkName => {
    parkIssuesMap.set(parkName, techIssues.filter(i => i.parque === parkName));
  });

  // Get unique cities
  const uniqueCities = Array.from(new Set(
    parkNames
      .map(parkName => parkCityMap.get(parkName))
      .filter((city): city is string => city !== undefined)
  )).sort();

  // If a park is selected, show the park view with contact info
  if (selectedPark) {
    const parkIssues = parkIssuesMap.get(selectedPark) || [];
    const manager = parkManagers.find(m => m.parkName === selectedPark);
    const parkSensor = mockSensors.find(s => s.parqueNome === selectedPark);
    
    return (
      <ParkOcorrenciasView
        parkName={selectedPark}
        manager={manager}
        issues={parkIssues}
        onBack={() => setSelectedPark(null)}
        onSelectIssue={onSelectIssue}
        onUpdateSensor={onUpdateSensor}
        onCreateTaskFromIssue={onCreateTaskFromIssue}
        sensors={sensors}
      />
    );
  }

  // Otherwise show the park list with filter options
  const filtered = techIssues.filter(i => {
    const estOk = estFilter === 'todos' || i.estado === estFilter;
    const sevOk = sevFilter === 'todos' || i.severidade === sevFilter;
    const parkCity = parkCityMap.get(i.parque);
    const cidadeOk = cidadeFilter === 'todas' || parkCity === cidadeFilter;
    return estOk && sevOk && cidadeOk;
  });

  // Filter parks by city
  const visibleParkNames = parkNames.filter(parkName => {
    const parkCity = parkCityMap.get(parkName);
    return cidadeFilter === 'todas' || parkCity === cidadeFilter;
  });

  const counts = {
    aberto: techIssues.filter(i => i.estado === 'aberto').length,
    prog:   techIssues.filter(i => i.estado === 'em-progresso').length,
    resolv: techIssues.filter(i => i.estado === 'resolvido').length,
  };

  return (
    <div className="space-y-4">
      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <QuickStat label="Em Aberto"    value={counts.aberto} color="#d4183d" icon="fa-circle-exclamation" />
        <QuickStat label="Em Progresso" value={counts.prog}   color="#f59e0b" icon="fa-spinner" />
        <QuickStat label="Resolvidas"   value={counts.resolv} color="#22c55e" icon="fa-circle-check" />
      </div>

      {/* Filtro por Cidade */}
      <div className="flex flex-wrap gap-2">
        <div className="flex rounded-xl overflow-hidden border border-border flex-wrap">
          <button
            onClick={() => setCidadeFilter('todas')}
            className={`px-3 py-1.5 transition-colors ${cidadeFilter === 'todas' ? 'bg-primary text-white' : 'bg-card text-muted-foreground hover:bg-muted'}`}
            style={{ fontSize: '0.75rem', fontWeight: 600 }}
          >
            <i className="fas fa-map-pin mr-1" aria-hidden="true"></i>
            Todas as Cidades
          </button>
          {uniqueCities.map(city => (
            <button
              key={city}
              onClick={() => setCidadeFilter(city)}
              className={`px-3 py-1.5 transition-colors ${cidadeFilter === city ? 'bg-primary text-white' : 'bg-card text-muted-foreground hover:bg-muted'}`}
              style={{ fontSize: '0.75rem', fontWeight: 600 }}
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      {/* Filtros de Estado e Severidade */}
      <div className="flex flex-wrap gap-2">
        <div className="flex rounded-xl overflow-hidden border border-border">
          {(['todos', 'aberto', 'em-progresso', 'resolvido'] as const).map(f => (
            <button
              key={f}
              onClick={() => setEstFilter(f)}
              className={`px-3 py-1.5 transition-colors ${estFilter === f ? 'bg-primary text-white' : 'bg-card text-muted-foreground hover:bg-muted'}`}
              style={{ fontSize: '0.75rem', fontWeight: 600 }}
            >
              {f === 'todos' ? 'Todos' : f === 'aberto' ? 'Abertos' : f === 'em-progresso' ? 'Em Progresso' : 'Resolvidos'}
            </button>
          ))}
        </div>
        <div className="flex rounded-xl overflow-hidden border border-border">
          {(['todos', 'critica', 'aviso'] as const).map(f => (
            <button
              key={f}
              onClick={() => setSevFilter(f)}
              className={`px-3 py-1.5 transition-colors ${sevFilter === f ? 'bg-primary text-white' : 'bg-card text-muted-foreground hover:bg-muted'}`}
              style={{ fontSize: '0.75rem', fontWeight: 600 }}
            >
              {f === 'todos' ? 'Todas' : f === 'critica' ? 'Crítica' : 'Aviso'}
            </button>
          ))}
        </div>
      </div>

      {/* Park cards with issues */}
      {visibleParkNames.length === 0 ? (
        <EmptyState icon="fa-check-circle" title="Sem ocorrências" desc="Nenhum resultado com os filtros selecionados." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
          {visibleParkNames.map(parkName => {
            const parkIssues = parkIssuesMap.get(parkName) || [];
            const manager = parkManagers.find(m => m.parkName === parkName);
            
            // Apply filters
            const filteredParkIssues = parkIssues.filter(i => {
              const estOk = estFilter === 'todos' || i.estado === estFilter;
              const sevOk = sevFilter === 'todos' || i.severidade === sevFilter;
              return estOk && sevOk;
            });

            if (filteredParkIssues.length === 0) return null;

            const issuesByType = {
              aberto: filteredParkIssues.filter(i => i.estado === 'aberto').length,
              prog: filteredParkIssues.filter(i => i.estado === 'em-progresso').length,
              resolv: filteredParkIssues.filter(i => i.estado === 'resolvido').length,
            };

            return (
              <button
                key={parkName}
                onClick={() => setSelectedPark(parkName)}
                className="text-left bg-card border border-border rounded-2xl p-4 hover:border-primary/50 hover:bg-card/85 transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="text-foreground font-bold" style={{ fontSize: '1rem' }}>
                      {parkName}
                    </h3>
                    {manager && (
                      <p className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>
                        <i className="fas fa-user mr-1" aria-hidden="true"></i>
                        {manager.managerName}
                      </p>
                    )}
                  </div>
                  <i className="fas fa-chevron-right text-primary" style={{ fontSize: '1rem' }} aria-hidden="true"></i>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ background: '#d4183d20', color: '#d4183d' }}>
                    Abertos: {issuesByType.aberto}
                  </span>
                  <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ background: '#f59e0b20', color: '#f59e0b' }}>
                    Em Progresso: {issuesByType.prog}
                  </span>
                  <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ background: '#22c55e20', color: '#22c55e' }}>
                    Resolvidas: {issuesByType.resolv}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Park Ocorrências View - Shows manager info & park issues
// ────────────────────────────────────────────────────────────────────────────
function ParkOcorrenciasView({
  parkName,
  manager,
  issues,
  onBack,
  onSelectIssue,
  onUpdateSensor,
  onCreateTaskFromIssue,
  sensors,
}: {
  parkName: string;
  manager?: ParkManager;
  issues: IssueReport[];
  onBack: () => void;
  onSelectIssue: (i: IssueReport) => void;
  onUpdateSensor: (s: SensorDevice) => void;
  onCreateTaskFromIssue: (i: IssueReport) => void;
  sensors: SensorDevice[];
}) {
  return (
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex items-start justify-between p-4 bg-card border border-border rounded-2xl">
        <div>
          <h2 className="text-foreground font-bold" style={{ fontSize: '1.1rem' }}>
            {parkName}
          </h2>
          <p className="text-muted-foreground mt-1" style={{ fontSize: '0.75rem' }}>
            Total: {issues.length} ocorrências
          </p>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground"
          style={{ fontSize: '0.8rem', fontWeight: 600 }}
        >
          <i className="fas fa-arrow-left" aria-hidden="true"></i>
          Voltar
        </button>
      </div>

      {/* Manager contact info */}
      {manager && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
          <h3 className="text-foreground font-bold mb-3" style={{ fontSize: '0.875rem' }}>
            <i className="fas fa-info-circle text-primary mr-1.5" aria-hidden="true"></i>
            Contacto do Gerente
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-card rounded-xl p-3 border border-border">
              <p className="text-muted-foreground text-xs mb-1">
                <i className="fas fa-user text-primary mr-1.5" aria-hidden="true"></i>
                Nome
              </p>
              <p className="text-foreground font-semibold" style={{ fontSize: '0.9rem' }}>
                {manager.managerName}
              </p>
            </div>
            <div className="bg-card rounded-xl p-3 border border-border">
              <p className="text-muted-foreground text-xs mb-1">
                <i className="fas fa-phone text-primary mr-1.5" aria-hidden="true"></i>
                Telemóvel
              </p>
              <a
                href={`tel:${manager.phone}`}
                className="text-primary font-semibold hover:underline"
                style={{ fontSize: '0.9rem' }}
              >
                {manager.phone}
              </a>
            </div>
            <div className="bg-card rounded-xl p-3 border border-border">
              <p className="text-muted-foreground text-xs mb-1">
                <i className="fas fa-envelope text-primary mr-1.5" aria-hidden="true"></i>
                Email
              </p>
              <a
                href={`mailto:${manager.email}`}
                className="text-primary font-semibold hover:underline truncate"
                style={{ fontSize: '0.9rem' }}
              >
                {manager.email}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Issues list */}
      <div>
        <h3 className="text-foreground font-bold mb-2" style={{ fontSize: '0.875rem' }}>
          <i className="fas fa-list-check text-primary mr-1.5" aria-hidden="true"></i>
          Ocorrências ({issues.length})
        </h3>
        {issues.length === 0 ? (
          <EmptyState icon="fa-check-circle" title="Sem ocorrências" desc="Nenhuma ocorrência registada para este parque." />
        ) : (
          <div className="space-y-2">
            {issues.map(issue => {
              const sensor = sensors.find(s => s.id === issue.sensorId);
              return (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  sensor={sensor}
                  onClick={() => onSelectIssue(issue)}
                  onUpdate={sensor ? () => onUpdateSensor(sensor) : undefined}
                  onCreateTask={issue.tipo === 'sensor' ? () => onCreateTaskFromIssue(issue) : undefined}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function IssueCard({
  issue,
  sensor,
  onClick,
  onUpdate,
  onCreateTask,
}: {
  issue: IssueReport;
  sensor?: SensorDevice;
  onClick: () => void;
  onUpdate?: () => void;
  onCreateTask?: () => void;
}) {
  const sevColor = issue.severidade === 'critica' ? '#d4183d' : issue.severidade === 'aviso' ? '#f59e0b' : '#3b82f6';
  const sevLabel = issue.severidade === 'critica' ? 'Crítico' : issue.severidade === 'aviso' ? 'Aviso' : 'Info';
  const tipoIcon = issue.tipo === 'sensor' ? 'fa-microchip' : 'fa-server';
  const estadoBadge =
    issue.estado === 'aberto'       ? { label: 'Aberto',       color: '#d4183d', bg: '#d4183d20' } :
    issue.estado === 'em-progresso' ? { label: 'Em progresso', color: '#f59e0b', bg: '#f59e0b20' } :
                                      { label: 'Resolvido',    color: '#22c55e', bg: '#22c55e20' };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 hover:border-primary/30 hover:shadow-sm transition-all">
      <div className="flex items-start gap-3">
        <button
          onClick={onClick}
          className="flex-1 text-left flex items-start gap-3"
          aria-label={`Ver ocorrência: ${issue.parque}`}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${sevColor}15` }} aria-hidden="true">
            <i className={`fas ${tipoIcon}`} style={{ color: sevColor, fontSize: '0.9rem' }}></i>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="text-foreground" style={{ fontSize: '0.875rem', fontWeight: 700 }}>{issue.parque}</span>
              {issue.zona && <span className="text-muted-foreground" style={{ fontSize: '0.72rem' }}>· {issue.zona}</span>}
            </div>
            <p className="text-foreground/80" style={{ fontSize: '0.8rem', lineHeight: 1.4 }}>{issue.descricao}</p>
            {issue.sensorId && (
              <p className="text-muted-foreground mt-1" style={{ fontSize: '0.7rem' }}>
                <i className="fas fa-tag mr-1" aria-hidden="true"></i>
                Sensor: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{issue.sensorId}</span>
                {sensor && ` · Uptime: ${sensor.uptimePercent}% · Tx.FP: ${sensor.taxaFalsosPositivos}%`}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="px-1.5 py-0.5 rounded-full" style={{ fontSize: '0.65rem', fontWeight: 700, background: `${sevColor}20`, color: sevColor }}>{sevLabel}</span>
              <span className="px-1.5 py-0.5 rounded-full" style={{ fontSize: '0.65rem', fontWeight: 700, background: estadoBadge.bg, color: estadoBadge.color }}>{estadoBadge.label}</span>
              <span className="text-muted-foreground/70 ml-auto" style={{ fontSize: '0.65rem' }}>
                {new Date(issue.criadoEm).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </button>

        {/* Quick create task button (only for sensor issues) */}
        {onCreateTask && issue.estado !== 'resolvido' && (
          <button
            onClick={onCreateTask}
            className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 transition-colors"
            style={{ fontSize: '0.72rem', fontWeight: 600 }}
            aria-label="Criar tarefa de manutenção"
            title="Criar tarefa de manutenção para este sensor"
          >
            <i className="fas fa-plus-circle" style={{ fontSize: '0.7rem' }} aria-hidden="true"></i>
            Tarefa
          </button>
        )}

        {/* Quick update button (only for active issues with a known sensor) */}
        {onUpdate && issue.estado !== 'resolvido' && (
          <button
            onClick={onUpdate}
            className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
            style={{ fontSize: '0.72rem', fontWeight: 600 }}
            aria-label="Atualizar estado do sensor"
          >
            <i className="fas fa-pen-to-square" style={{ fontSize: '0.7rem' }} aria-hidden="true"></i>
            Atualizar
          </button>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TAB: SENSORES — park cards with expandable floor map (US#13 + US#14)
// ────────────────────────────────────────────────────────────────────────────
function SensoresTab({
  sensors,
  statusFil,
  setStatusFil,
  onSelect,
  kpis,
}: {
  sensors: SensorDevice[];
  statusFil: StatusFil;
  setStatusFil: (f: StatusFil) => void;
  onSelect: (s: SensorDevice) => void;
  kpis: ReturnType<typeof computeTechKPIs>;
}) {
  const [selectedParkId, setSelectedParkId] = useState<string | null>(null);
  const [cidadeFilter, setCidadeFilter] = useState<'todas' | string>('todas');

  // Derive unique parks from the FULL sensor list (before status filter) to always show all parks
  const allParkIds = Array.from(new Set(mockSensors.map(s => s.parqueId)));
  
  // Get unique cities from all sensors
  const uniqueCities = Array.from(new Set(mockSensors.map(s => s.cidade))).sort();

  const statusFilters: { value: StatusFil; label: string; count: number }[] = [
    { value: 'todos',       label: 'Todos',       count: mockSensors.length },
    { value: 'operacional', label: 'Operacional', count: kpis.operacionais },
    { value: 'falha',       label: 'Falha',       count: kpis.emFalha },
    { value: 'offline',     label: 'Offline',     count: kpis.offline },
    { value: 'manutencao',  label: 'Manutenção',  count: kpis.emManutencao },
  ];

  // If a park is selected, show the park map view
  if (selectedParkId) {
    return (
      <ParkSensorMapView
        parkId={selectedParkId}
        allSensors={mockSensors.filter(s => s.parqueId === selectedParkId)}
        statusFilter={statusFil}
        onBack={() => setSelectedParkId(null)}
        onSelectSensor={onSelect}
      />
    );
  }

  // Filter parks based on statusFil and cidadeFilter
  const visibleParkIds = allParkIds.filter(parkId => {
    const parkSensors = mockSensors.filter(s => s.parqueId === parkId);
    const park = parkSensors[0];
    
    // Check city filter
    if (cidadeFilter !== 'todas' && park && park.cidade !== cidadeFilter) {
      return false;
    }
    
    // Check status filter
    if (statusFil === 'todos') return true;
    if (statusFil === 'operacional') {
      return parkSensors.length > 0 && parkSensors.every(s => s.status === 'operacional');
    }
    return parkSensors.some(s => s.status === statusFil);
  });

  // Park list view
  return (
    <div className="space-y-4">
      {/* Filtro por Cidade */}
      <div className="flex flex-wrap gap-2">
        <div className="flex rounded-xl overflow-hidden border border-border flex-wrap">
          <button
            onClick={() => setCidadeFilter('todas')}
            className={`px-3 py-1.5 transition-colors ${cidadeFilter === 'todas' ? 'bg-primary text-white' : 'bg-card text-muted-foreground hover:bg-muted'}`}
            style={{ fontSize: '0.75rem', fontWeight: 600 }}
          >
            <i className="fas fa-map-pin mr-1" aria-hidden="true"></i>
            Todas as Cidades
          </button>
          {uniqueCities.map(city => (
            <button
              key={city}
              onClick={() => setCidadeFilter(city)}
              className={`px-3 py-1.5 transition-colors ${cidadeFilter === city ? 'bg-primary text-white' : 'bg-card text-muted-foreground hover:bg-muted'}`}
              style={{ fontSize: '0.75rem', fontWeight: 600 }}
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      {/* Filter pills for status */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFil(f.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-colors ${
              statusFil === f.value
                ? 'bg-primary text-white border-primary'
                : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:bg-muted'
            }`}
            style={{ fontSize: '0.78rem', fontWeight: 600 }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Park cards */}
      <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
        {visibleParkIds.length === 0 && (
          <div className="col-span-2">
            <EmptyState icon="fa-circle-check" title="Sem parques" desc="Nenhum parque corresponde aos filtros selecionados." />
          </div>
        )}
        {visibleParkIds.map(parkId => {
          const allParkSensors = mockSensors.filter(s => s.parqueId === parkId);
          const park = allParkSensors[0];
          if (!park) return null;

          const faultCount = allParkSensors.filter(s => s.status !== 'operacional').length;
          const healthPct = allParkSensors.length > 0
            ? Math.round(allParkSensors.filter(s => s.status === 'operacional').length / allParkSensors.length * 100)
            : 100;
          const healthColor = healthPct > 90 ? '#22c55e' : healthPct > 70 ? '#f59e0b' : '#d4183d';
          const statusByState = {
            operacional: allParkSensors.filter(s => s.status === 'operacional').length,
            falha: allParkSensors.filter(s => s.status === 'falha').length,
            offline: allParkSensors.filter(s => s.status === 'offline').length,
            manutencao: allParkSensors.filter(s => s.status === 'manutencao').length,
          };

          return (
            <button
              key={parkId}
              onClick={() => setSelectedParkId(parkId)}
              className="text-left bg-card border border-border rounded-2xl p-4 hover:border-primary/50 hover:bg-card/85 transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-foreground font-bold" style={{ fontSize: '1rem' }}>
                    {park.parqueNome}
                  </h3>
                  <p className="text-muted-foreground" style={{ fontSize: '0.78rem' }}>
                    <i className="fas fa-location-dot mr-1" aria-hidden="true"></i>
                    {park.cidade}
                  </p>
                </div>
                <i className="fas fa-map text-primary" style={{ fontSize: '1.25rem' }} aria-hidden="true"></i>
              </div>

              {/* Status bar */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${healthPct}%`, background: healthColor }}
                  />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: healthColor }}>
                  {healthPct}%
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-2">
                <StatBadge
                  label="OK"
                  value={statusByState.operacional}
                  color="#22c55e"
                  icon="fa-circle-check"
                />
                <StatBadge
                  label="Falha"
                  value={statusByState.falha}
                  color="#d4183d"
                  icon="fa-circle-xmark"
                />
                <StatBadge
                  label="Manutenção"
                  value={statusByState.manutencao}
                  color="#f59e0b"
                  icon="fa-wrench"
                />
                <StatBadge
                  label="Offline"
                  value={statusByState.offline}
                  color="#6b7280"
                  icon="fa-circle-minus"
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Helper: Status badge for park card
function StatBadge({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: string;
}) {
  return (
    <div
      className="rounded-lg p-2 flex flex-col items-center justify-center"
      style={{ background: `${color}15` }}
    >
      <i className={`fas ${icon}`} style={{ color, fontSize: '0.85rem' }} aria-hidden="true"></i>
      <span style={{ fontSize: '0.65rem', fontWeight: 700, color, marginTop: '0.25rem' }}>
        {value}
      </span>
      <span style={{ fontSize: '0.6rem', color: 'var(--color-muted-foreground)' }}>
        {label}
      </span>
    </div>
  );
}

// ─── Park Sensor Map View (full-screen mapa) ───────────────────────────────────
function ParkSensorMapView({
  parkId,
  allSensors,
  statusFilter,
  onBack,
  onSelectSensor,
}: {
  parkId: string;
  allSensors: SensorDevice[];
  statusFilter: StatusFil;
  onBack: () => void;
  onSelectSensor: (s: SensorDevice) => void;
}) {
  const [activeFloorIdx, setActiveFloorIdx] = useState(0);
  const [localFilter, setLocalFilter] = useState<StatusFil>(statusFilter);
  const [visibleSensorsCount, setVisibleSensorsCount] = useState(5);
  const lot = mockParkingLots.find(l => l.id === parkId) ?? null;
  const activeFloor = lot?.floors?.[activeFloorIdx];

  // Map sensor.lugar → SensorDevice
  const sensorBySpot: Record<string, SensorDevice> = {};
  allSensors.forEach(s => {
    if (s.lugar) sensorBySpot[s.lugar] = s;
  });

  // Count by status
  const statusCounts = {
    operacional: allSensors.filter(s => s.status === 'operacional').length,
    falha: allSensors.filter(s => s.status === 'falha').length,
    offline: allSensors.filter(s => s.status === 'offline').length,
    manutencao: allSensors.filter(s => s.status === 'manutencao').length,
  };

  const parkName = allSensors[0]?.parqueNome ?? parkId;

  return (
    <div className="space-y-3">
      {/* Header with back button */}
      <div className="flex items-center justify-between p-3 bg-card border border-border rounded-xl">
        <div>
          <h2 className="text-foreground font-bold" style={{ fontSize: '1rem' }}>
            <i className="fas fa-map mr-2 text-primary" aria-hidden="true"></i>
            {parkName}
          </h2>
          <p className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>
            Total: {allSensors.length} sensores
          </p>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground"
          style={{ fontSize: '0.8rem', fontWeight: 600 }}
        >
          <i className="fas fa-arrow-left" aria-hidden="true"></i>
          Voltar
        </button>
      </div>

      {/* Status counts */}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <StatBadge
          label="Operacional"
          value={statusCounts.operacional}
          color="#22c55e"
          icon="fa-circle-check"
        />
        <StatBadge
          label="Falha"
          value={statusCounts.falha}
          color="#d4183d"
          icon="fa-circle-xmark"
        />
        <StatBadge
          label="Manutenção"
          value={statusCounts.manutencao}
          color="#f59e0b"
          icon="fa-wrench"
        />
        <StatBadge
          label="Offline"
          value={statusCounts.offline}
          color="#6b7280"
          icon="fa-circle-minus"
        />
      </div>

      {/* Floor selector */}
      {lot?.floors && lot.floors.length > 0 && (
        <div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {lot.floors.map((floor, idx) => (
              <button
                key={floor.id}
                onClick={() => setActiveFloorIdx(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  activeFloorIdx === idx
                    ? 'bg-primary text-white border-primary'
                    : 'bg-card text-muted-foreground border-border hover:bg-muted'
                }`}
              >
                {floor.name}
              </button>
            ))}
          </div>

          {/* Floor map */}
          {activeFloor && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 bg-muted/30 border-b border-border flex flex-wrap items-center justify-between gap-3">
                <span className="text-foreground font-bold" style={{ fontSize: '0.875rem' }}>
                  {activeFloor.name} — Sensores
                </span>
                <div className="flex flex-wrap gap-2">
                  <TechMapLegend color="#22c55e" label="Operacional" />
                  <TechMapLegend color="#d4183d" label="Falha" />
                  <TechMapLegend color="#f59e0b" label="Manutenção" />
                  <TechMapLegend color="#6b7280" label="Offline" />
                  <TechMapLegend color="var(--color-muted)" label="Sem sensor" />
                </div>
              </div>
              <div className="p-4 overflow-x-auto scrollbar-none flex justify-center bg-muted/10 overscroll-x-contain">
                <div
                  className="grid gap-1.5"
                  style={{ gridTemplateColumns: `repeat(${activeFloor.cols}, 48px)` }}
                >
                  {activeFloor.spots.map(spot => {
                    const sensor = spot.label ? sensorBySpot[spot.label] : undefined;
                    if (sensor && localFilter !== 'todos' && sensor.status !== localFilter) {
                      return null;
                    }
                    return (
                      <button
                        key={spot.id}
                        onClick={() => sensor && onSelectSensor(sensor)}
                        className={`flex flex-col items-center justify-center rounded-lg shadow-sm transition-all ${
                          sensor ? 'cursor-pointer hover:scale-110' : ''
                        }`}
                        style={{
                          width: 48,
                          height: 48,
                          background: sensor ? STATUS_COLOR[sensor.status] : 'var(--color-muted)',
                          opacity: sensor ? 1 : 0.3,
                        }}
                        title={sensor ? `${sensor.id} (${sensor.lugar})` : `Lugar ${spot.label || 'vazio'}`}
                        aria-label={
                          sensor
                            ? `Sensor ${sensor.id}: ${STATUS_LABEL[sensor.status]}`
                            : `Lugar ${spot.label || 'vazio'}`
                        }
                      >
                        <i
                          className={`fas ${sensor ? TIPO_ICON[sensor.tipo] : 'fa-square'} text-white text-[11px]`}
                          aria-hidden="true"
                        />
                        {spot.label && (
                          <span className="text-white font-bold text-[8px] mt-0.5">
                            {spot.label}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sensor list */}
      <div>
        <h3 className="text-foreground mb-3 font-bold" style={{ fontSize: '0.875rem' }}>
          <i className="fas fa-list mr-2 text-primary" aria-hidden="true"></i>
          Sensores ({allSensors.filter(s => localFilter === 'todos' || s.status === localFilter).length})
        </h3>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={() => setLocalFilter('todos')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
              localFilter === 'todos'
                ? 'bg-primary text-white border-primary'
                : 'bg-card text-muted-foreground border-border hover:border-primary/50'
            }`}
          >
            Todos ({allSensors.length})
          </button>
          <button
            onClick={() => setLocalFilter('operacional')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
              localFilter === 'operacional'
                ? 'bg-green-500 text-white border-green-500'
                : 'bg-card text-muted-foreground border-border hover:border-green-500/50'
            }`}
          >
            Operacional ({statusCounts.operacional})
          </button>
          <button
            onClick={() => setLocalFilter('falha')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
              localFilter === 'falha'
                ? 'bg-red-500 text-white border-red-500'
                : 'bg-card text-muted-foreground border-border hover:border-red-500/50'
            }`}
          >
            Falha ({statusCounts.falha})
          </button>
          <button
            onClick={() => setLocalFilter('offline')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
              localFilter === 'offline'
                ? 'bg-gray-500 text-white border-gray-500'
                : 'bg-card text-muted-foreground border-border hover:border-gray-500/50'
            }`}
          >
            Offline ({statusCounts.offline})
          </button>
          <button
            onClick={() => setLocalFilter('manutencao')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
              localFilter === 'manutencao'
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-card text-muted-foreground border-border hover:border-amber-500/50'
            }`}
          >
            Manutenção ({statusCounts.manutencao})
          </button>
        </div>

        <div className="space-y-2">
          {allSensors
            .filter(s => localFilter === 'todos' || s.status === localFilter)
            .slice(0, visibleSensorsCount)
            .map(sensor => {
              const color = STATUS_COLOR[sensor.status];
              return (
                <button
                  key={sensor.id}
                  onClick={() => onSelectSensor(sensor)}
                  className="w-full text-left flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:border-primary/30 hover:bg-card/85 transition-all"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}20` }}
                    aria-hidden="true"
                  >
                    <i
                      className={`fas ${TIPO_ICON[sensor.tipo]}`}
                      style={{ color, fontSize: '0.9rem' }}
                    ></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-foreground font-bold" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {sensor.id}
                      </span>
                      <span className="text-muted-foreground" style={{ fontSize: '0.72rem' }}>
                        {sensor.zona}
                        {sensor.lugar ? ` · ${sensor.lugar}` : ''}
                      </span>
                    </div>
                    <p className="text-muted-foreground" style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>
                      {sensor.tipo} • FW {sensor.firmware} • Uptime {sensor.uptimePercent}%
                    </p>
                  </div>
                  <span
                    className="px-2 py-1 rounded-full flex-shrink-0"
                    style={{ fontSize: '0.65rem', fontWeight: 700, background: `${color}20`, color }}
                  >
                    {STATUS_LABEL[sensor.status]}
                  </span>
                </button>
              );
            })}
          
          {/* Mostrar mais button */}
          {allSensors.filter(s => localFilter === 'todos' || s.status === localFilter).length > visibleSensorsCount && (
            <button
              onClick={() => setVisibleSensorsCount(prev => prev + 5)}
              className="w-full flex items-center justify-center gap-2 p-3 mt-3 bg-muted border border-border rounded-lg hover:bg-muted/80 transition-colors text-primary font-bold"
              style={{ fontSize: '0.85rem' }}
            >
              <i className="fas fa-plus" aria-hidden="true"></i>
              Mostrar mais ({allSensors.filter(s => localFilter === 'todos' || s.status === localFilter).length - visibleSensorsCount} restantes)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tech Map Legend ───────────────────────────────────────────────────────────
function TechMapLegend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: color }} aria-hidden="true" />
      <span className="text-muted-foreground" style={{ fontSize: '0.65rem' }}>{label}</span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TAB: TAREFAS
// ────────────────────────────────────────────────────────────────────────────
type TarefaFiltro = 'urgente' | 'em-progresso' | 'pendente' | 'concluida';

function TarefasTab({
  orders,
  sensors,
  onUpdate,
  onNewOrder,
}: {
  orders: MaintenanceOrder[];
  sensors: SensorDevice[];
  onUpdate: (id: string, estado: 'em-progresso' | 'concluida') => void;
  onNewOrder: () => void;
}) {
  const [tarefaFil, setTarefaFil] = useState<TarefaFiltro>('urgente');

  const urgentes   = orders.filter(o => (o.prioridade === 'critica' || o.prioridade === 'alta') && o.estado === 'pendente');
  const emCurso    = orders.filter(o => o.estado === 'em-progresso');
  const pendentes  = orders.filter(o => (o.prioridade === 'media' || o.prioridade === 'baixa') && o.estado === 'pendente');
  const concluidas = orders.filter(o => o.estado === 'concluida');

  // Determine which orders to show and styling based on active filter
  const visibleOrders =
    tarefaFil === 'urgente'      ? urgentes   :
    tarefaFil === 'em-progresso' ? emCurso    :
    tarefaFil === 'pendente'     ? pendentes  :
                                   concluidas;

  const filterConfig = {
    urgente:      { icon: 'fa-circle-exclamation', label: 'Urgente',   borderColor: 'border-red-500/30',   bg: 'rgba(212,24,61,0.04)' },
    'em-progresso': { icon: 'fa-spinner',            label: 'Em Curso',  borderColor: 'border-blue-500/30',  bg: 'rgba(59,130,246,0.04)' },
    pendente:     { icon: 'fa-hourglass-half',     label: 'Pendente', borderColor: 'border-border',       bg: 'transparent' },
    concluida:    { icon: 'fa-circle-check',       label: 'Concluída', borderColor: 'border-green-500/20', bg: 'transparent' },
  };

  const activeConfig = filterConfig[tarefaFil];

  return (
    <div className="space-y-4">
      {/* Resumo rápido (clicável como filtros) + botão nova tarefa */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setTarefaFil('urgente')}
            className={`transition-all transform ${tarefaFil === 'urgente' ? 'scale-105' : 'hover:scale-102'}`}
          >
            <QuickStat label="Urgentes"   value={urgentes.length}   color="#d4183d" icon="fa-circle-exclamation" active={tarefaFil === 'urgente'} />
          </button>
          <button
            onClick={() => setTarefaFil('em-progresso')}
            className={`transition-all transform ${tarefaFil === 'em-progresso' ? 'scale-105' : 'hover:scale-102'}`}
          >
            <QuickStat label="Em Curso"   value={emCurso.length}    color="#3b82f6" icon="fa-spinner" active={tarefaFil === 'em-progresso'} />
          </button>
          <button
            onClick={() => setTarefaFil('pendente')}
            className={`transition-all transform ${tarefaFil === 'pendente' ? 'scale-105' : 'hover:scale-102'}`}
          >
            <QuickStat label="Pendentes"  value={pendentes.length}  color="#f59e0b" icon="fa-hourglass-half" active={tarefaFil === 'pendente'} />
          </button>
          <button
            onClick={() => setTarefaFil('concluida')}
            className={`transition-all transform ${tarefaFil === 'concluida' ? 'scale-105' : 'hover:scale-102'}`}
          >
            <QuickStat label="Concluídas" value={concluidas.length} color="#22c55e" icon="fa-circle-check" active={tarefaFil === 'concluida'} />
          </button>
        </div>
        <button
          onClick={onNewOrder}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors"
          style={{ fontSize: '0.85rem', fontWeight: 700 }}
        >
          <i className="fas fa-plus" style={{ fontSize: '0.75rem' }} aria-hidden="true"></i>
          Nova Tarefa
        </button>
      </div>

      {/* Tarefas visíveis */}
      {visibleOrders.length === 0 ? (
        <EmptyState icon={activeConfig.icon} title={`Sem tarefas ${activeConfig.label.toLowerCase()}s`} desc="Nenhuma tarefa nesta categoria." />
      ) : (
        <div
          className={`rounded-2xl border overflow-hidden ${activeConfig.borderColor} ${
            tarefaFil === 'concluida' ? 'opacity-80' : ''
          }`}
          style={{ background: activeConfig.bg }}
        >
          {visibleOrders.map((order, idx) => (
            <TarefaCard
              key={order.id}
              order={order}
              sensor={sensors.find(s => s.id === order.sensorId)}
              onUpdate={onUpdate}
              hasBorder={idx < visibleOrders.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TarefaCard({
  order,
  sensor,
  onUpdate,
  hasBorder,
}: {
  order: MaintenanceOrder;
  sensor?: SensorDevice;
  onUpdate: (id: string, estado: 'em-progresso' | 'concluida') => void;
  hasBorder: boolean;
}) {
  const priColor = PRIO_COLOR[order.prioridade];

  return (
    <div
      className={`bg-card px-4 py-3.5 flex items-start gap-3 ${hasBorder ? 'border-b border-border' : ''}`}
    >
      {/* Priority stripe */}
      <div
        className="w-1 self-stretch rounded-full flex-shrink-0 mt-0.5"
        style={{ background: priColor, minHeight: '32px' }}
        aria-hidden="true"
      />

      <div className="flex-1 min-w-0">
        {/* Title + badges */}
        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
          <span className="text-foreground" style={{ fontSize: '0.9rem', fontWeight: 700 }}>{order.titulo}</span>
          <span
            className="px-1.5 py-0.5 rounded-full"
            style={{ fontSize: '0.6rem', fontWeight: 700, background: `${priColor}20`, color: priColor }}
          >
            {PRIO_LABEL[order.prioridade]}
          </span>
        </div>

        {/* Description */}
        <p className="text-foreground/75" style={{ fontSize: '0.78rem', lineHeight: 1.4 }}>{order.descricao}</p>

        {/* Meta row */}
        <div className="flex flex-wrap gap-3 mt-1" style={{ fontSize: '0.7rem', color: 'var(--color-muted-foreground)' }}>
          <span>
            <i className="fas fa-location-dot mr-1" aria-hidden="true"></i>
            {order.parque}
          </span>
          <span style={{ fontFamily: 'monospace' }}>
            <i className="fas fa-microchip mr-1" aria-hidden="true"></i>
            {order.sensorId}
          </span>
          {order.prazo && (
            <span className="text-amber-600 dark:text-amber-400">
              <i className="fas fa-clock mr-1" aria-hidden="true"></i>
              {new Date(order.prazo).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {/* Sensor alert */}
        {sensor && sensor.status !== 'operacional' && (
          <div
            className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg"
            style={{ background: `${STATUS_COLOR[sensor.status]}12`, fontSize: '0.68rem' }}
          >
            <i className={`fas ${STATUS_ICON[sensor.status]}`} style={{ color: STATUS_COLOR[sensor.status] }} aria-hidden="true"></i>
            <span className="text-muted-foreground">Sensor:</span>
            <span style={{ color: STATUS_COLOR[sensor.status], fontWeight: 700 }}>{STATUS_LABEL[sensor.status]}</span>
          </div>
        )}

        {order.notas && (
          <p className="mt-1 text-muted-foreground" style={{ fontSize: '0.7rem' }}>
            <i className="fas fa-note-sticky mr-1" aria-hidden="true"></i>
            {order.notas}
          </p>
        )}
      </div>

      {/* Action buttons */}
      {order.estado !== 'concluida' && (
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          {order.estado === 'pendente' && (
            <button
              onClick={() => onUpdate(order.id, 'em-progresso')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-colors"
              style={{ fontSize: '0.72rem', fontWeight: 600 }}
              aria-label="Iniciar tarefa"
            >
              <i className="fas fa-play" style={{ fontSize: '0.62rem' }} aria-hidden="true"></i>
              Iniciar
            </button>
          )}
          <button
            onClick={() => onUpdate(order.id, 'concluida')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 transition-colors"
            style={{ fontSize: '0.72rem', fontWeight: 600 }}
            aria-label="Concluir tarefa"
          >
            <i className="fas fa-check" style={{ fontSize: '0.62rem' }} aria-hidden="true"></i>
            Concluir
          </button>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// MODAL: Issue Detail (US#12)
// ────────────────────────────────────────────────────────────────────────────
function IssueDetailModal({
  issue,
  sensor,
  onClose,
  onUpdateSensor,
}: {
  issue: IssueReport;
  sensor: SensorDevice | null;
  onClose: () => void;
  onUpdateSensor: (s: SensorDevice) => void;
}) {
  const sevColor = issue.severidade === 'critica' ? '#d4183d' : issue.severidade === 'aviso' ? '#f59e0b' : '#3b82f6';
  const tipoIcon = issue.tipo === 'sensor' ? 'fa-microchip' : issue.tipo === 'cliente' ? 'fa-user-circle' : 'fa-server';
  const reportadorInfo = 
    issue.tipo === 'cliente' && issue.matricula 
      ? { label: 'Matrícula do Veículo', value: issue.matricula, icon: 'fa-car' }
      : issue.tipo === 'sensor' && issue.sensorId
      ? { label: 'ID do Sensor', value: issue.sensorId, icon: 'fa-microchip' }
      : { label: 'Origem', value: 'Sistema', icon: 'fa-server' };

  // Função para descarregar relatório em JSON
  const handleDownloadReport = () => {
    const reportData = {
      ocorrenciaID: issue.id,
      parque: issue.parque,
      zona: issue.zona || '-',
      tipo: issue.tipo,
      severidade: issue.severidade,
      estado: issue.estado,
      descricao: issue.descricao,
      reportadorInfo: reportadorInfo,
      dataCriacao: issue.criadoEm,
      atribuidoA: issue.atribuidoA || '-',
      ...(sensor && {
        sensor: {
          id: sensor.id,
          tipo: sensor.tipo,
          status: sensor.status,
          uptimePercent: sensor.uptimePercent,
          taxaFalsosPositivos: sensor.taxaFalsosPositivos,
          firmware: sensor.firmware,
          ultimaManutencao: sensor.ultimaManutencao,
          ultimaLeitura: sensor.ultimaLeitura,
          historicoErros: sensor.historicoErros.map(e => ({
            codigo: e.codigo,
            descricao: e.descricao,
            timestamp: e.timestamp,
            resolvido: e.resolvido,
          })),
        },
      }),
    };

    const jsonString = JSON.stringify(reportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ocorrencia-${issue.id}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Detalhe: ${issue.parque}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-card border border-border rounded-2xl p-5 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${sevColor}15` }} aria-hidden="true">
            <i className={`fas ${tipoIcon}`} style={{ color: sevColor, fontSize: '1rem' }}></i>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-foreground" style={{ fontSize: '1.05rem', fontWeight: 800 }}>{issue.parque}</h2>
            {issue.zona && <p className="text-muted-foreground" style={{ fontSize: '0.78rem' }}>{issue.zona}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground" aria-label="Fechar">
            <i className="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </div>

        {/* Ficha de Reporte — Quem reportou e Descrição */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-foreground font-bold" style={{ fontSize: '0.875rem' }}>
              <i className="fas fa-file-alt text-primary mr-1.5" aria-hidden="true"></i>
              Ficha do Reporte
            </h3>
            <button
              onClick={handleDownloadReport}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary/20 text-primary transition-colors"
              title="Descarregar relatório em JSON"
              aria-label="Descarregar relatório"
            >
              <i className="fas fa-download" style={{ fontSize: '0.85rem' }} aria-hidden="true"></i>
            </button>
          </div>
          
          {/* Quem reportou */}
          <div className="mb-3 pb-3 border-b border-primary/10">
            <p className="text-muted-foreground text-xs mb-1.5" style={{ fontWeight: 500 }}>
              <i className={`fas ${reportadorInfo.icon} mr-1.5`} aria-hidden="true"></i>
              {reportadorInfo.label}
            </p>
            <p className="text-foreground font-semibold" style={{ fontSize: '0.9rem', fontFamily: 'monospace' }}>
              {reportadorInfo.value}
            </p>
            <p className="text-muted-foreground text-xs mt-1.5">
              <i className="fas fa-clock mr-1" aria-hidden="true"></i>
              {new Date(issue.criadoEm).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {/* Descrição do problema */}
          <div>
            <p className="text-muted-foreground text-xs mb-1.5" style={{ fontWeight: 500 }}>
              <i className="fas fa-exclamation-circle text-primary mr-1.5" aria-hidden="true"></i>
              Descrição do Problema
            </p>
            <p className="text-foreground/85" style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
              {issue.descricao}
            </p>
          </div>
        </div>

        {/* Sensor live data */}
        {sensor && (
          <div className="bg-muted/20 rounded-xl p-3 mb-4 grid grid-cols-2 gap-x-4 gap-y-2" style={{ fontSize: '0.78rem' }}>
            <MetaRow label="Estado Atual" value={STATUS_LABEL[sensor.status]} color={STATUS_COLOR[sensor.status]} />
            <MetaRow label="Última Leitura" value={new Date(sensor.ultimaLeitura).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} />
            <MetaRow label="Uptime" value={`${sensor.uptimePercent}%`} />
            <MetaRow label="Taxa Falsos-Pos." value={`${sensor.taxaFalsosPositivos}%`} />
            <MetaRow label="Firmware" value={sensor.firmware} mono />
            <MetaRow label="Últ. Manutenção" value={sensor.ultimaManutencao} />
          </div>
        )}

        {/* Full error history (US#12) */}
        {sensor && (
          <div className="mb-4">
            <h3 className="text-foreground mb-2" style={{ fontSize: '0.875rem', fontWeight: 700 }}>
              <i className="fas fa-list-ul text-primary mr-1.5" aria-hidden="true"></i>
              Histórico Completo de Erros ({sensor.historicoErros.length})
            </h3>
            {sensor.historicoErros.length === 0 ? (
              <p className="text-muted-foreground text-center py-3" style={{ fontSize: '0.78rem' }}>Sem erros registados para este sensor.</p>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {sensor.historicoErros.map(e => (
                  <div key={e.id} className={`border rounded-xl p-2.5 ${e.resolvido ? 'border-green-200 dark:border-green-900' : 'border-destructive/30 bg-destructive/5'}`}>
                    <div className="flex items-start gap-2">
                      <i
                        className={`fas mt-0.5 flex-shrink-0 ${e.resolvido ? 'fa-check text-green-500' : 'fa-circle-exclamation text-destructive'}`}
                        style={{ fontSize: '0.75rem' }}
                        aria-hidden="true"
                      ></i>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-foreground" style={{ fontFamily: 'monospace', fontSize: '0.72rem', fontWeight: 700 }}>{e.codigo}</span>
                          <span className="text-muted-foreground" style={{ fontSize: '0.65rem' }}>
                            {new Date(e.timestamp).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {e.resolvido && (
                            <span className="text-green-500" style={{ fontSize: '0.62rem', fontWeight: 600 }}>Resolvido</span>
                          )}
                        </div>
                        <p className="text-foreground/80 mt-0.5" style={{ fontSize: '0.72rem', lineHeight: 1.4 }}>{e.descricao}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-border">
          {sensor && issue.estado !== 'resolvido' && (
            <button
              onClick={() => onUpdateSensor(sensor)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors"
              style={{ fontSize: '0.875rem', fontWeight: 700 }}
            >
              <i className="fas fa-pen-to-square" aria-hidden="true"></i>
              Atualizar Estado do Sensor
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground" style={{ fontSize: '0.875rem' }}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// MODAL: Sensor Diagnostic Panel
// ────────────────────────────────────────────────────────────────────────────
function SensorDiagPanel({
  sensor,
  onClose,
  onUpdate,
}: {
  sensor: SensorDevice;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [activeFloorIdx, setActiveFloorIdx] = useState(0);
  const color = STATUS_COLOR[sensor.status];
  const lot = mockParkingLots.find(l => l.id === sensor.parqueId) ?? null;
  const activeFloor = lot?.floors?.[activeFloorIdx];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Diagnóstico: ${sensor.id}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-card border border-border rounded-2xl p-5 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }} aria-hidden="true">
            <i className={`fas ${TIPO_ICON[sensor.tipo]}`} style={{ color, fontSize: '1.1rem' }}></i>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-foreground" style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 800 }}>{sensor.id}</h2>
            <p className="text-muted-foreground" style={{ fontSize: '0.78rem' }}>{sensor.parqueNome} · {sensor.zona}{sensor.lugar ? ` · ${sensor.lugar}` : ''}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground" aria-label="Fechar">
            <i className="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </div>

        {/* Status */}
        <div className="flex gap-2 mb-4">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: `${color}20`, color }}>
            <i className={`fas ${STATUS_ICON[sensor.status]}`} aria-hidden="true"></i>
            <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{STATUS_LABEL[sensor.status]}</span>
          </span>
          <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground" style={{ fontSize: '0.75rem', fontWeight: 600 }}>{sensor.tipo}</span>
          <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground" style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{sensor.firmware}</span>
        </div>

        {/* Park floor map - if disponível */}
        {lot?.floors && lot.floors.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {lot.floors.map((floor, idx) => (
                <button
                  key={floor.id}
                  onClick={() => setActiveFloorIdx(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    activeFloorIdx === idx
                      ? 'bg-primary text-white border-primary'
                      : 'bg-card text-muted-foreground border-border hover:bg-muted'
                  }`}
                >
                  {floor.name}
                </button>
              ))}
            </div>

            {activeFloor && (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-3 py-2 bg-muted/30 border-b border-border flex flex-wrap items-center justify-between gap-2">
                  <span className="text-foreground font-bold" style={{ fontSize: '0.75rem' }}>
                    Localização no {activeFloor.name}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <TechMapLegend color="#22c55e" label="Operacional" />
                    <TechMapLegend color="#d4183d" label="Falha" />
                    <TechMapLegend color="#f59e0b" label="Manutenção" />
                    <TechMapLegend color="#6b7280" label="Offline" />
                    <TechMapLegend color="#3b82f6" label="Este sensor" />
                  </div>
                </div>
                <div className="p-3 overflow-x-auto scrollbar-none flex justify-center bg-muted/10 overscroll-x-contain">
                  <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${activeFloor.cols}, 34px)` }}>
                    {activeFloor.spots.map(spot => {
                      const isSensorSpot = sensor.lugar === spot.label;
                      return (
                        <div
                          key={spot.id}
                          className={`flex flex-col items-center justify-center rounded-lg shadow-sm cursor-pointer transition-all ${
                            isSensorSpot ? 'ring-2 ring-offset-1 ring-blue-500 scale-110' : ''
                          }`}
                          style={{
                            width: 34,
                            height: 34,
                            background: isSensorSpot ? '#3b82f6' : 'var(--color-muted)',
                            opacity: isSensorSpot ? 1 : 0.4,
                          }}
                          title={`Lugar ${spot.label}`}
                          aria-label={`Lugar ${spot.label}${isSensorSpot ? ' - Este sensor' : ''}`}
                        >
                          <i
                            className={`fas ${isSensorSpot ? 'fa-microchip' : 'fa-square'} text-white text-[10px]`}
                            aria-hidden="true"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Diagnostic data */}
        <div className="bg-muted/30 rounded-xl p-3 mb-4 grid grid-cols-2 gap-x-4 gap-y-2">
          <MetaRow label="Uptime" value={`${sensor.uptimePercent}%`} />
          <MetaRow label="Taxa Falsos-Pos." value={`${sensor.taxaFalsosPositivos}%`} />
          <MetaRow label="Instalado em" value={sensor.instaladoEm} />
          <MetaRow label="Últ. Manutenção" value={sensor.ultimaManutencao} />
          <MetaRow
            label="Última Leitura"
            value={new Date(sensor.ultimaLeitura).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          />
          <MetaRow label="Zona" value={sensor.zona} />
        </div>

        {/* Error history */}
        <h3 className="text-foreground mb-2" style={{ fontSize: '0.875rem', fontWeight: 700 }}>
          <i className="fas fa-list-ul text-primary mr-1.5" aria-hidden="true"></i>
          Histórico de Erros ({sensor.historicoErros.length})
        </h3>
        {sensor.historicoErros.length === 0 ? (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 text-center mb-4">
            <i className="fas fa-check-circle text-green-500" style={{ fontSize: '1.2rem' }} aria-hidden="true"></i>
            <p className="text-green-700 dark:text-green-400 mt-1" style={{ fontSize: '0.78rem', fontWeight: 600 }}>Sem erros registados</p>
          </div>
        ) : (
          <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-1">
            {sensor.historicoErros.map(e => (
              <div key={e.id} className={`border rounded-xl p-2.5 ${e.resolvido ? 'border-border' : 'border-destructive/30 bg-destructive/5'}`}>
                <div className="flex items-start gap-2">
                  <i className={`fas mt-0.5 ${e.resolvido ? 'fa-check text-green-500' : 'fa-circle-exclamation text-destructive'}`} style={{ fontSize: '0.75rem' }} aria-hidden="true"></i>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-foreground" style={{ fontFamily: 'monospace', fontSize: '0.7rem', fontWeight: 700 }}>{e.codigo}</span>
                      <span className="text-muted-foreground" style={{ fontSize: '0.65rem' }}>
                        {new Date(e.timestamp).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-foreground/80 mt-0.5" style={{ fontSize: '0.72rem', lineHeight: 1.4 }}>{e.descricao}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t border-border">
          <button
            onClick={onUpdate}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors"
            style={{ fontSize: '0.875rem', fontWeight: 700 }}
          >
            <i className="fas fa-pen-to-square" aria-hidden="true"></i>
            Atualizar Estado
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground" style={{ fontSize: '0.875rem' }}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// MODAL: Status Update (US#14)
// ────────────────────────────────────────────────────────────────────────────
function StatusUpdateModal({
  sensor,
  onClose,
  onConfirm,
}: {
  sensor: SensorDevice;
  onClose: () => void;
  onConfirm: (id: string, status: SensorStatus, notes: string) => void;
}) {
  const [newStatus, setNewStatus] = useState<SensorStatus>(sensor.status);
  const [notes, setNotes] = useState('');

  const options: { value: SensorStatus; label: string; icon: string; desc: string }[] = [
    { value: 'operacional', label: 'Operacional', icon: 'fa-circle-check', desc: 'Sensor reparado e em funcionamento normal' },
    { value: 'manutencao',  label: 'Manutenção',  icon: 'fa-wrench',       desc: 'Intervenção em curso, monitoring suspenso' },
    { value: 'falha',       label: 'Falha',        icon: 'fa-circle-xmark', desc: 'Falha confirmada, aguarda reparação' },
    { value: 'offline',     label: 'Offline',      icon: 'fa-circle-minus', desc: 'Sem comunicação, fora de serviço' },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Atualizar estado do sensor">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-card border border-border rounded-2xl p-5 w-full max-w-md shadow-2xl">

        <div className="flex items-center gap-2 mb-1">
          <i className="fas fa-pen-to-square text-primary" style={{ fontSize: '1.1rem' }} aria-hidden="true"></i>
          <h2 className="text-foreground" style={{ fontSize: '1rem', fontWeight: 800 }}>Atualizar Estado do Sensor</h2>
          <button onClick={onClose} className="ml-auto w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground" aria-label="Fechar">
            <i className="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </div>

        <p className="text-muted-foreground mb-4" style={{ fontSize: '0.78rem' }}>
          Sensor: <span className="text-foreground font-bold" style={{ fontFamily: 'monospace' }}>{sensor.id}</span>
          {' · '}Estado atual:{' '}
          <span style={{ color: STATUS_COLOR[sensor.status], fontWeight: 700 }}>{STATUS_LABEL[sensor.status]}</span>
        </p>

        <div role="radiogroup" aria-label="Novo estado" className="space-y-2 mb-4">
          {options.map(opt => (
            <label
              key={opt.value}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                newStatus === opt.value
                  ? 'border-primary/60 bg-primary/5'
                  : 'border-border hover:border-primary/30 hover:bg-muted/30'
              }`}
            >
              <input type="radio" name="newStatus" value={opt.value} checked={newStatus === opt.value} onChange={() => setNewStatus(opt.value)} className="sr-only" />
              <i
                className={`fas ${opt.icon} flex-shrink-0`}
                style={{ color: STATUS_COLOR[opt.value], fontSize: '1rem', width: '16px', textAlign: 'center' }}
                aria-hidden="true"
              ></i>
              <div className="flex-1 min-w-0">
                <p className="text-foreground" style={{ fontSize: '0.875rem', fontWeight: 600 }}>{opt.label}</p>
                <p className="text-muted-foreground" style={{ fontSize: '0.68rem' }}>{opt.desc}</p>
              </div>
              {newStatus === opt.value && (
                <i className="fas fa-check text-primary" style={{ fontSize: '0.8rem' }} aria-hidden="true"></i>
              )}
            </label>
          ))}
        </div>

        <div className="mb-4">
          <label htmlFor="update-notes" className="block text-foreground mb-1" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
            Notas Técnicas <span className="text-muted-foreground font-normal">(opcional)</span>
          </label>
          <textarea
            id="update-notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Reparação efetuada, componentes substituídos, observações técnicas…"
            className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-foreground resize-none focus:outline-none focus:border-primary/50 transition-colors"
            style={{ fontSize: '0.8rem', lineHeight: 1.5 }}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onConfirm(sensor.id, newStatus, notes)}
            disabled={newStatus === sensor.status && notes.trim() === ''}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontSize: '0.875rem', fontWeight: 700 }}
          >
            Confirmar Atualização
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground" style={{ fontSize: '0.875rem' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// MODAL: Nova Ordem
// ────────────────────────────────────────────────────────────────────────────
function NewOrderModal({
  sensors,
  onClose,
  onCreate,
}: {
  sensors: SensorDevice[];
  onClose: () => void;
  onCreate: (order: MaintenanceOrder) => void;
}) {
  const [sensorId, setSensorId]   = useState(sensors[0]?.id ?? '');
  const [titulo, setTitulo]       = useState('');
  const [descricao, setDescricao] = useState('');
  const [prioridade, setPrioridade] = useState<'critica' | 'alta' | 'media' | 'baixa'>('media');

  const handleSubmit = () => {
    if (!titulo.trim() || !sensorId) return;
    const sensor = sensors.find(s => s.id === sensorId)!;
    const order: MaintenanceOrder = {
      id: `ORD-${Date.now()}`,
      sensorId,
      parque: sensor.parqueNome,
      zona: sensor.zona,
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      prioridade,
      estado: 'pendente',
      criadaEm: new Date().toISOString(),
      tecnico: 'Laura Farias',
    };
    onCreate(order);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Nova ordem de manutenção">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-card border border-border rounded-2xl p-5 w-full max-w-md shadow-2xl">

        <div className="flex items-center gap-2 mb-4">
          <i className="fas fa-plus-circle text-primary" style={{ fontSize: '1.1rem' }} aria-hidden="true"></i>
          <h2 className="text-foreground" style={{ fontSize: '1rem', fontWeight: 800 }}>Nova Ordem de Manutenção</h2>
          <button onClick={onClose} className="ml-auto w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground" aria-label="Fechar">
            <i className="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </div>

        <div className="space-y-3">
          {/* Sensor selector */}
          <div>
            <label htmlFor="order-sensor" className="block text-foreground mb-1" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Sensor</label>
            <select
              id="order-sensor"
              value={sensorId}
              onChange={e => setSensorId(e.target.value)}
              className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary/50 transition-colors"
              style={{ fontSize: '0.82rem', fontFamily: 'monospace' }}
            >
              {sensors.map(s => (
                <option key={s.id} value={s.id}>
                  {s.id} — {s.parqueNome} · {STATUS_LABEL[s.status]}
                </option>
              ))}
            </select>
          </div>
          {/* Title */}
          <div>
            <label htmlFor="order-titulo" className="block text-foreground mb-1" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Título</label>
            <input
              id="order-titulo"
              type="text"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              maxLength={100}
              placeholder="Resumo da intervenção"
              className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary/50 transition-colors"
              style={{ fontSize: '0.82rem' }}
            />
          </div>
          {/* Description */}
          <div>
            <label htmlFor="order-desc" className="block text-foreground mb-1" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Descrição</label>
            <textarea
              id="order-desc"
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Detalhes da intervenção necessária…"
              className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-foreground resize-none focus:outline-none focus:border-primary/50 transition-colors"
              style={{ fontSize: '0.8rem', lineHeight: 1.5 }}
            />
          </div>
          {/* Priority */}
          <div>
            <p className="text-foreground mb-1.5" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Prioridade</p>
            <div className="flex gap-2">
              {(['critica', 'alta', 'media', 'baixa'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPrioridade(p)}
                  className="flex-1 py-1.5 rounded-xl border transition-colors"
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: prioridade === p ? `${PRIO_COLOR[p]}20` : undefined,
                    borderColor: prioridade === p ? PRIO_COLOR[p] : undefined,
                    color: prioridade === p ? PRIO_COLOR[p] : undefined,
                  }}
                >
                  {PRIO_LABEL[p]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4 pt-3 border-t border-border">
          <button
            onClick={handleSubmit}
            disabled={!titulo.trim() || !sensorId}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontSize: '0.875rem', fontWeight: 700 }}
          >
            Criar Ordem
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground" style={{ fontSize: '0.875rem' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// MODAL: Quick Task from Issue (criar tarefa rápida a partir de ocorrência)
// ────────────────────────────────────────────────────────────────────────────
function QuickTaskFromIssueModal({
  issue,
  sensors,
  onClose,
  onCreate,
}: {
  issue: IssueReport;
  sensors: SensorDevice[];
  onClose: () => void;
  onCreate: (order: MaintenanceOrder) => void;
}) {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState(issue.descricao);
  const [prioridade, setPrioridade] = useState<'critica' | 'alta' | 'media' | 'baixa'>(
    issue.severidade === 'critica' ? 'critica' : 'alta'
  );

  const sensorId = issue.sensorId;
  const sensor = sensors.find(s => s.id === sensorId);

  const handleSubmit = () => {
    if (!titulo.trim() || !sensorId || !sensor) return;
    const order: MaintenanceOrder = {
      id: `ORD-${Date.now()}`,
      sensorId,
      parque: issue.parque,
      zona: issue.zona ?? '',
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      prioridade,
      estado: 'pendente',
      criadaEm: new Date().toISOString(),
      tecnico: 'Laura Farias',
    };
    onCreate(order);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Criar tarefa de manutenção">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-card border border-border rounded-2xl p-5 w-full max-w-md shadow-2xl">

        <div className="flex items-center gap-2 mb-4">
          <i className="fas fa-plus-circle text-green-600 dark:text-green-400" style={{ fontSize: '1.1rem' }} aria-hidden="true"></i>
          <h2 className="text-foreground" style={{ fontSize: '1rem', fontWeight: 800 }}>Criar Tarefa</h2>
          <button onClick={onClose} className="ml-auto w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground" aria-label="Fechar">
            <i className="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </div>

        {/* Context Info - Read Only */}
        <div className="bg-muted/30 rounded-xl p-3 mb-4 space-y-2">
          <MetaRow label="Parque" value={issue.parque} />
          <MetaRow label="Sensor" value={sensorId || 'N/A'} mono />
          {issue.zona && <MetaRow label="Zona" value={issue.zona} />}
          <MetaRow label="Ocorrência" value={issue.descricao} />
        </div>

        <div className="space-y-3">
          {/* Title */}
          <div>
            <label htmlFor="quick-titulo" className="block text-foreground mb-1" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Título da Tarefa *</label>
            <input
              id="quick-titulo"
              type="text"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              maxLength={100}
              placeholder="Ex: Substituir sensor IR deficiente"
              className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary/50 transition-colors"
              style={{ fontSize: '0.82rem' }}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="quick-desc" className="block text-foreground mb-1" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Descrição</label>
            <textarea
              id="quick-desc"
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-foreground resize-none focus:outline-none focus:border-primary/50 transition-colors"
              style={{ fontSize: '0.8rem', lineHeight: 1.5 }}
            />
          </div>

          {/* Priority */}
          <div>
            <p className="text-foreground mb-1.5" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Prioridade</p>
            <div className="flex gap-2">
              {(['critica', 'alta', 'media', 'baixa'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPrioridade(p)}
                  className="flex-1 py-1.5 rounded-xl border transition-colors"
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: prioridade === p ? `${PRIO_COLOR[p]}20` : undefined,
                    borderColor: prioridade === p ? PRIO_COLOR[p] : undefined,
                    color: prioridade === p ? PRIO_COLOR[p] : undefined,
                  }}
                >
                  {PRIO_LABEL[p]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4 pt-3 border-t border-border">
          <button
            onClick={handleSubmit}
            disabled={!titulo.trim()}
            className="flex-1 py-2.5 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontSize: '0.875rem', fontWeight: 700 }}
          >
            <i className="fas fa-check mr-1.5" aria-hidden="true"></i>
            Criar Tarefa
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground" style={{ fontSize: '0.875rem' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Reutilizáveis ────────────────────────────────────────────────────────────
function TabBtn({
  active, onClick, icon, label, badge,
}: {
  active: boolean; onClick: () => void; icon: string; label: string; badge?: number;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition-all ${active ? 'bg-card shadow text-primary font-bold' : 'text-muted-foreground hover:text-foreground'}`}
      style={{ fontSize: '0.8rem' }}
    >
      <i className={`fas ${icon}`} style={{ fontSize: '0.85rem' }} aria-hidden="true"></i>
      <span className="hidden sm:inline">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="px-1.5 py-0 rounded-full bg-destructive/15 text-destructive" style={{ fontSize: '0.65rem', fontWeight: 700 }}>
          {badge}
        </span>
      )}
    </button>
  );
}

function QuickStat({ label, value, color, icon, active }: { label: string; value: number; color: string; icon: string; active?: boolean }) {
  return (
    <div 
      className={`bg-card border rounded-2xl p-3 flex items-center gap-3 transition-all ${
        active ? 'border-primary shadow-lg' : 'border-border'
      }`}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }} aria-hidden="true">
        <i className={`fas ${icon}`} style={{ color, fontSize: '1rem' }}></i>
      </div>
      <div className="min-w-0">
        <p className="text-foreground" style={{ fontSize: '1.3rem', fontWeight: 800, lineHeight: 1 }}>{value}</p>
        <p className="text-muted-foreground" style={{ fontSize: '0.7rem', fontWeight: 600 }}>{label}</p>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-8 text-center">
      <i className={`fas ${icon} text-green-500 mb-2`} style={{ fontSize: '2rem' }} aria-hidden="true"></i>
      <p className="text-foreground" style={{ fontWeight: 600 }}>{title}</p>
      <p className="text-muted-foreground mt-1" style={{ fontSize: '0.8rem' }}>{desc}</p>
    </div>
  );
}

function MetaRow({ label, value, mono, color }: { label: string; value: string; mono?: boolean; color?: string }) {
  return (
    <div>
      <p className="text-muted-foreground" style={{ fontSize: '0.68rem', fontWeight: 500 }}>{label}</p>
      <p className="text-foreground" style={{ fontSize: '0.78rem', fontWeight: 600, fontFamily: mono ? 'monospace' : undefined, color }}>{value}</p>
    </div>
  );
}
