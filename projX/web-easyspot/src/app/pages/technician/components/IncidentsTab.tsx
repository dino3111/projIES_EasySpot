import { useState } from 'react';
import { type SensorDevice } from '../../../data/technicianData';
import { type IssueReport } from '../MaintenancePage';
import { parkManagers, parkCityMapFromSensors, type ParkManager } from './maintenanceTypes';
import { QuickStat, EmptyState } from './shared';

type IncidentStatusFilter = 'todos' | 'aberto' | 'em-progresso' | 'resolvido';
type IncidentSeverityFilter = 'todos' | 'critica' | 'aviso';

type IncidentsTabProps = Readonly<{
  issues: IssueReport[];
  sensors: SensorDevice[];
  onSelectIssue: (i: IssueReport) => void;
  onUpdateSensor: (s: SensorDevice) => void;
  onCreateTaskFromIssue: (i: IssueReport) => void;
}>;

type ParkOcorrenciasViewProps = Readonly<{
  parkName: string;
  manager?: ParkManager;
  issues: IssueReport[];
  onBack: () => void;
  onSelectIssue: (i: IssueReport) => void;
  onUpdateSensor: (s: SensorDevice) => void;
  onCreateTaskFromIssue: (i: IssueReport) => void;
  sensors: SensorDevice[];
  initialEstFilter?: IncidentStatusFilter;
}>;

type IssueCardProps = Readonly<{
  issue: IssueReport;
  sensor?: SensorDevice;
  onClick: () => void;
  onUpdate?: () => void;
  onCreateTask?: () => void;
}>;

const ISSUE_STATUS_BADGES: Record<IssueReport['estado'], { label: string; color: string; bg: string }> = {
  aberto: { label: 'Aberto', color: '#d4183d', bg: '#d4183d20' },
  'em-progresso': { label: 'Em progresso', color: '#f59e0b', bg: '#f59e0b20' },
  resolvido: { label: 'Resolvido', color: '#22c55e', bg: '#22c55e20' },
};

export function IncidentsTab({
  issues,
  sensors,
  onSelectIssue,
  onUpdateSensor,
  onCreateTaskFromIssue,
}: IncidentsTabProps) {
  const [estFilter, setEstFilter] = useState<IncidentStatusFilter>('todos');
  const [sevFilter, setSevFilter] = useState<IncidentSeverityFilter>('todos');
  const [cidadeFilter, setCidadeFilter] = useState('todas');
  const [selectedPark, setSelectedPark] = useState<string | null>(null);

  const parkCityMap = parkCityMapFromSensors(sensors);
  const parkNames = Array.from(new Set(issues.map(i => i.parque)));
  const parkIssuesMap = new Map<string, IssueReport[]>();
  parkNames.forEach(n => parkIssuesMap.set(n, issues.filter(i => i.parque === n)));

  const uniqueCities = Array.from(new Set(
    parkNames.map(n => parkCityMap.get(n)).filter((c): c is string => !!c)
  )).sort((a, b) => a.localeCompare(b, 'pt-PT'));

  if (selectedPark) {
    const manager = parkManagers.find(m => m.parkName === selectedPark);
    return (
      <ParkOcorrenciasView
        parkName={selectedPark}
        manager={manager}
        issues={parkIssuesMap.get(selectedPark) ?? []}
        onBack={() => setSelectedPark(null)}
        onSelectIssue={onSelectIssue}
        onUpdateSensor={onUpdateSensor}
        onCreateTaskFromIssue={onCreateTaskFromIssue}
        sensors={sensors}
        initialEstFilter={estFilter === 'todos' ? 'aberto' : estFilter}
      />
    );
  }

  const visibleParkNames = parkNames.filter(n => {
    const city = parkCityMap.get(n);
    return cidadeFilter === 'todas' || city === cidadeFilter;
  });

  const counts = {
    aberto: issues.filter(i => i.estado === 'aberto').length,
    prog:   issues.filter(i => i.estado === 'em-progresso').length,
    resolv: issues.filter(i => i.estado === 'resolvido').length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <QuickStat label="Em Aberto"    value={counts.aberto} color="#d4183d" icon="fa-circle-exclamation" />
        <QuickStat label="Em Progresso" value={counts.prog}   color="#f59e0b" icon="fa-spinner" />
        <QuickStat label="Resolvidas"   value={counts.resolv} color="#22c55e" icon="fa-circle-check" />
      </div>

      {uniqueCities.length > 0 && (
        <div className="flex rounded-xl overflow-hidden border border-border flex-wrap">
          <button
            onClick={() => setCidadeFilter('todas')}
            className={`px-3 py-1.5 transition-colors ${cidadeFilter === 'todas' ? 'bg-primary text-white' : 'bg-card text-muted-foreground hover:bg-muted'}`}
            style={{ fontSize: '0.75rem', fontWeight: 600 }}
          >
            <i className="fas fa-map-pin mr-1" aria-hidden="true" />
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
      )}

      <div className="flex flex-wrap gap-2">
        <div className="flex rounded-xl overflow-hidden border border-border">
          {(['todos', 'aberto', 'em-progresso', 'resolvido'] as const).map(f => (
            <button
              key={f}
              onClick={() => setEstFilter(f)}
              className={`px-3 py-1.5 transition-colors ${estFilter === f ? 'bg-primary text-white' : 'bg-card text-muted-foreground hover:bg-muted'}`}
              style={{ fontSize: '0.75rem', fontWeight: 600 }}
            >
              {{ todos: 'Todos', aberto: 'Abertos', 'em-progresso': 'Em Progresso', resolvido: 'Resolvidos' }[f]}
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
              {{ todos: 'Todas', critica: 'Crítica', aviso: 'Aviso' }[f]}
            </button>
          ))}
        </div>
      </div>

      {visibleParkNames.length === 0 ? (
        <EmptyState icon="fa-check-circle" title="Sem ocorrências" desc="Nenhum resultado com os filtros selecionados." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
          {visibleParkNames.map(parkName => {
            const parkIssues = parkIssuesMap.get(parkName) ?? [];
            const manager = parkManagers.find(m => m.parkName === parkName);
            const filtered = parkIssues.filter(i => {
              const estOk = estFilter === 'todos' || i.estado === estFilter;
              const sevOk = sevFilter === 'todos' || i.severidade === sevFilter;
              return estOk && sevOk;
            });
            if (filtered.length === 0) return null;
            const byType = {
              aberto: filtered.filter(i => i.estado === 'aberto').length,
              prog:   filtered.filter(i => i.estado === 'em-progresso').length,
              resolv: filtered.filter(i => i.estado === 'resolvido').length,
            };
            return (
              <button
                key={parkName}
                onClick={() => setSelectedPark(parkName)}
                className="text-left bg-card border border-border rounded-2xl p-4 hover:border-primary/50 hover:bg-card/85 transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="text-foreground font-bold" style={{ fontSize: '1rem' }}>{parkName}</h3>
                    {manager && (
                      <p className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>
                        <i className="fas fa-user mr-1" aria-hidden="true" />
                        {manager.managerName}
                      </p>
                    )}
                  </div>
                  <i className="fas fa-chevron-right text-primary" style={{ fontSize: '1rem' }} aria-hidden="true" />
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ background: '#d4183d20', color: '#d4183d' }}>Abertos: {byType.aberto}</span>
                  <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ background: '#f59e0b20', color: '#f59e0b' }}>Em Progresso: {byType.prog}</span>
                  <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ background: '#22c55e20', color: '#22c55e' }}>Resolvidas: {byType.resolv}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ParkOcorrenciasView({
  parkName, manager, issues, onBack, onSelectIssue, onUpdateSensor, onCreateTaskFromIssue, sensors, initialEstFilter = 'aberto',
}: ParkOcorrenciasViewProps) {
  const [parkEstFilter, setParkEstFilter] = useState<IncidentStatusFilter>(initialEstFilter);

  const activeIssues = issues.filter(i => {
    if (parkEstFilter === 'todos') return true;
    return i.estado === parkEstFilter;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between p-4 bg-card border border-border rounded-2xl">
        <div>
          <h2 className="text-foreground font-bold" style={{ fontSize: '1.1rem' }}>{parkName}</h2>
          <p className="text-muted-foreground mt-1" style={{ fontSize: '0.75rem' }}>Total: {issues.length} ocorrências</p>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground"
          style={{ fontSize: '0.8rem', fontWeight: 600 }}
        >
          <i className="fas fa-arrow-left" aria-hidden="true" />
          Voltar
        </button>
      </div>

      {manager && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
          <h3 className="text-foreground font-bold mb-3" style={{ fontSize: '0.875rem' }}>
            <i className="fas fa-info-circle text-primary mr-1.5" aria-hidden="true" />
            Contacto do Gerente
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-card rounded-xl p-3 border border-border">
              <p className="text-muted-foreground text-xs mb-1"><i className="fas fa-user text-primary mr-1.5" aria-hidden="true" />Nome</p>
              <p className="text-foreground font-semibold" style={{ fontSize: '0.9rem' }}>{manager.managerName}</p>
            </div>
            <div className="bg-card rounded-xl p-3 border border-border">
              <p className="text-muted-foreground text-xs mb-1"><i className="fas fa-phone text-primary mr-1.5" aria-hidden="true" />Telemóvel</p>
              <a href={`tel:${manager.phone}`} className="text-primary font-semibold hover:underline" style={{ fontSize: '0.9rem' }}>{manager.phone}</a>
            </div>
            <div className="bg-card rounded-xl p-3 border border-border">
              <p className="text-muted-foreground text-xs mb-1"><i className="fas fa-envelope text-primary mr-1.5" aria-hidden="true" />Email</p>
              <a href={`mailto:${manager.email}`} className="text-primary font-semibold hover:underline truncate" style={{ fontSize: '0.9rem' }}>{manager.email}</a>
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
          <h3 className="text-foreground font-bold" style={{ fontSize: '0.875rem' }}>
            <i className="fas fa-list-check text-primary mr-1.5" aria-hidden="true" />
            Ocorrências ({activeIssues.length})
          </h3>
          <div className="flex rounded-xl overflow-hidden border border-border">
            {(['aberto', 'em-progresso', 'todos'] as const).map(f => (
              <button
                key={f}
                onClick={() => setParkEstFilter(f)}
                className={`px-2.5 py-1 transition-colors ${parkEstFilter === f ? 'bg-primary text-white' : 'bg-card text-muted-foreground hover:bg-muted'}`}
                style={{ fontSize: '0.72rem', fontWeight: 600 }}
              >
                {{ aberto: 'Abertos', 'em-progresso': 'Em Progresso', todos: 'Todos' }[f]}
              </button>
            ))}
          </div>
        </div>
        {activeIssues.length === 0 ? (
          <EmptyState icon="fa-check-circle" title="Sem ocorrências" desc="Nenhuma ocorrência com este estado para este parque." />
        ) : (
          <div className="space-y-2">
            {activeIssues.map(issue => {
              const sensor = sensors.find(s => s.id === issue.sensorId);
              return (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  sensor={sensor}
                  onClick={() => onSelectIssue(issue)}
                  onUpdate={sensor ? () => onUpdateSensor(sensor) : undefined}
                  onCreateTask={issue.tipo === 'sensor' && issue.estado === 'aberto'
                    ? () => onCreateTaskFromIssue(issue)
                    : undefined}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function IssueCard({ issue, sensor, onClick, onUpdate, onCreateTask }: IssueCardProps) {
  const severityMap = {
    critica: { color: '#d4183d', label: 'Crítico' },
    aviso:   { color: '#f59e0b', label: 'Aviso' },
    info:    { color: '#3b82f6', label: 'Info' },
  };
  const severityInfo = severityMap[issue.severidade];
  const tipoIcon = issue.tipo === 'sensor' ? 'fa-microchip' : 'fa-server';
  const estadoBadge = ISSUE_STATUS_BADGES[issue.estado];

  return (
    <div className="bg-card border border-border rounded-2xl p-4 hover:border-primary/30 hover:shadow-sm transition-all">
      <div className="flex items-start gap-3">
        <button onClick={onClick} className="flex-1 text-left flex items-start gap-3" aria-label={`Ver ocorrência: ${issue.parque}`}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${severityInfo.color}15` }} aria-hidden="true">
            <i className={`fas ${tipoIcon}`} style={{ color: severityInfo.color, fontSize: '0.9rem' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="text-foreground" style={{ fontSize: '0.875rem', fontWeight: 700 }}>{issue.parque}</span>
              {issue.zona && <span className="text-muted-foreground" style={{ fontSize: '0.72rem' }}>· {issue.zona}</span>}
            </div>
            <p className="text-foreground/80" style={{ fontSize: '0.8rem', lineHeight: 1.4 }}>{issue.descricao}</p>
            {issue.sensorId && (
              <p className="text-muted-foreground mt-1" style={{ fontSize: '0.7rem' }}>
                <i className="fas fa-tag mr-1" aria-hidden="true" />
                Sensor: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{issue.sensorId}</span>
                {sensor && ` · Uptime: ${sensor.uptimePercent}% · Tx.FP: ${sensor.taxaFalsosPositivos}%`}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="px-1.5 py-0.5 rounded-full" style={{ fontSize: '0.65rem', fontWeight: 700, background: `${severityInfo.color}20`, color: severityInfo.color }}>{severityInfo.label}</span>
              <span className="px-1.5 py-0.5 rounded-full" style={{ fontSize: '0.65rem', fontWeight: 700, background: estadoBadge.bg, color: estadoBadge.color }}>{estadoBadge.label}</span>
              <span className="text-muted-foreground/70 ml-auto" style={{ fontSize: '0.65rem' }}>
                {new Date(issue.criadoEm).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </button>

        {onCreateTask && issue.estado !== 'resolvido' && (
          <button
            onClick={onCreateTask}
            className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 transition-colors"
            style={{ fontSize: '0.72rem', fontWeight: 600 }}
            aria-label="Colocar em progresso"
          >
            <i className="fas fa-play-circle" style={{ fontSize: '0.7rem' }} aria-hidden="true" />
            Iniciar
          </button>
        )}
        {onUpdate && issue.estado !== 'resolvido' && (
          <button
            onClick={onUpdate}
            className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
            style={{ fontSize: '0.72rem', fontWeight: 600 }}
            aria-label="Atualizar estado do sensor"
          >
            <i className="fas fa-pen-to-square" style={{ fontSize: '0.7rem' }} aria-hidden="true" />
            Atualizar
          </button>
        )}
      </div>
    </div>
  );
}
