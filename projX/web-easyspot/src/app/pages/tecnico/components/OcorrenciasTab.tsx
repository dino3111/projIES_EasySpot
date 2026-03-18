import { useState } from 'react';
import { type SensorDevice } from '../../../data/technicianData';
import { type IssueReport } from '../../../data/gestorData';
import { parkManagers, techIssues, parkCityMapFromSensors, type ParkManager } from './manutencaoTypes';
import { QuickStat, EmptyState } from './shared';

export function OcorrenciasTab({
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

  const parkCityMap = parkCityMapFromSensors();
  const parkNames = Array.from(new Set(techIssues.map(i => i.parque)));
  const parkIssuesMap = new Map<string, IssueReport[]>();
  parkNames.forEach(n => parkIssuesMap.set(n, techIssues.filter(i => i.parque === n)));

  const uniqueCities = Array.from(new Set(
    parkNames.map(n => parkCityMap.get(n)).filter((c): c is string => c !== undefined)
  )).sort();

  if (selectedPark) {
    const manager = parkManagers.find(m => m.parkName === selectedPark);
    return (
      <ParkOcorrenciasView
        parkName={selectedPark}
        manager={manager}
        issues={parkIssuesMap.get(selectedPark) || []}
        onBack={() => setSelectedPark(null)}
        onSelectIssue={onSelectIssue}
        onUpdateSensor={onUpdateSensor}
        onCreateTaskFromIssue={onCreateTaskFromIssue}
        sensors={sensors}
      />
    );
  }

  const visibleParkNames = parkNames.filter(n => {
    const city = parkCityMap.get(n);
    return cidadeFilter === 'todas' || city === cidadeFilter;
  });

  const counts = {
    aberto: techIssues.filter(i => i.estado === 'aberto').length,
    prog:   techIssues.filter(i => i.estado === 'em-progresso').length,
    resolv: techIssues.filter(i => i.estado === 'resolvido').length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <QuickStat label="Em Aberto"    value={counts.aberto} color="#d4183d" icon="fa-circle-exclamation" />
        <QuickStat label="Em Progresso" value={counts.prog}   color="#f59e0b" icon="fa-spinner" />
        <QuickStat label="Resolvidas"   value={counts.resolv} color="#22c55e" icon="fa-circle-check" />
      </div>

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

      {visibleParkNames.length === 0 ? (
        <EmptyState icon="fa-check-circle" title="Sem ocorrências" desc="Nenhum resultado com os filtros selecionados." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
          {visibleParkNames.map(parkName => {
            const parkIssues = parkIssuesMap.get(parkName) || [];
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
                        <i className="fas fa-user mr-1" aria-hidden="true"></i>
                        {manager.managerName}
                      </p>
                    )}
                  </div>
                  <i className="fas fa-chevron-right text-primary" style={{ fontSize: '1rem' }} aria-hidden="true"></i>
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
  parkName, manager, issues, onBack, onSelectIssue, onUpdateSensor, onCreateTaskFromIssue, sensors,
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
          <i className="fas fa-arrow-left" aria-hidden="true"></i>
          Voltar
        </button>
      </div>

      {manager && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
          <h3 className="text-foreground font-bold mb-3" style={{ fontSize: '0.875rem' }}>
            <i className="fas fa-info-circle text-primary mr-1.5" aria-hidden="true"></i>
            Contacto do Gerente
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-card rounded-xl p-3 border border-border">
              <p className="text-muted-foreground text-xs mb-1"><i className="fas fa-user text-primary mr-1.5" aria-hidden="true"></i>Nome</p>
              <p className="text-foreground font-semibold" style={{ fontSize: '0.9rem' }}>{manager.managerName}</p>
            </div>
            <div className="bg-card rounded-xl p-3 border border-border">
              <p className="text-muted-foreground text-xs mb-1"><i className="fas fa-phone text-primary mr-1.5" aria-hidden="true"></i>Telemóvel</p>
              <a href={`tel:${manager.phone}`} className="text-primary font-semibold hover:underline" style={{ fontSize: '0.9rem' }}>{manager.phone}</a>
            </div>
            <div className="bg-card rounded-xl p-3 border border-border">
              <p className="text-muted-foreground text-xs mb-1"><i className="fas fa-envelope text-primary mr-1.5" aria-hidden="true"></i>Email</p>
              <a href={`mailto:${manager.email}`} className="text-primary font-semibold hover:underline truncate" style={{ fontSize: '0.9rem' }}>{manager.email}</a>
            </div>
          </div>
        </div>
      )}

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
  issue, sensor, onClick, onUpdate, onCreateTask,
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
        <button onClick={onClick} className="flex-1 text-left flex items-start gap-3" aria-label={`Ver ocorrência: ${issue.parque}`}>
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

        {onCreateTask && issue.estado !== 'resolvido' && (
          <button
            onClick={onCreateTask}
            className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 transition-colors"
            style={{ fontSize: '0.72rem', fontWeight: 600 }}
            aria-label="Criar tarefa de manutenção"
          >
            <i className="fas fa-plus-circle" style={{ fontSize: '0.7rem' }} aria-hidden="true"></i>
            Tarefa
          </button>
        )}
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
