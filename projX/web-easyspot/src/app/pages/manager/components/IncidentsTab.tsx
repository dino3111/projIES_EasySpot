import { mockIssues, type IssueReport } from '../../../data/gestorData';
import { QuickStat } from './shared';

type IssueFilter = 'todos' | 'aberto' | 'em-progresso' | 'resolvido';
type SevFilter = 'todos' | 'critica' | 'aviso' | 'info';

type IncidentsTabProps = Readonly<{
  issues: IssueReport[];
  issueFilter: IssueFilter;
  setIssueFilter: (f: IssueFilter) => void;
  sevFilter: SevFilter;
  setSevFilter: (f: SevFilter) => void;
  onSelect: (i: IssueReport) => void;
}>;

type IssueCardProps = Readonly<{
  issue: IssueReport;
  onClick: () => void;
}>;

const ISSUE_STATUS_BADGES: Record<IssueReport['estado'], { label: string; color: string; bg: string }> = {
  aberto: { label: 'Aberto', color: '#d4183d', bg: '#d4183d20' },
  'em-progresso': { label: 'Em progresso', color: '#f59e0b', bg: '#f59e0b20' },
  resolvido: { label: 'Resolvido', color: '#22c55e', bg: '#22c55e20' },
};

export function IncidentsTab({
  issues,
  issueFilter,
  setIssueFilter,
  sevFilter,
  setSevFilter,
  onSelect,
}: IncidentsTabProps) {
  const estadoCounts = {
    aberto: mockIssues.filter(i => i.estado === 'aberto').length,
    'em-progresso': mockIssues.filter(i => i.estado === 'em-progresso').length,
    resolvido: mockIssues.filter(i => i.estado === 'resolvido').length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <QuickStat label="Em Aberto"     value={estadoCounts.aberto}           color="#d4183d" icon="fa-circle-exclamation" />
        <QuickStat label="Em Progresso"  value={estadoCounts['em-progresso']}  color="#f59e0b" icon="fa-spinner" />
        <QuickStat label="Resolvidos"    value={estadoCounts.resolvido}        color="#22c55e" icon="fa-circle-check" />
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex rounded-xl overflow-hidden border border-border">
          {(['todos', 'aberto', 'em-progresso', 'resolvido'] as IssueFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setIssueFilter(f)}
              className={`px-3 py-1.5 transition-colors capitalize ${
                issueFilter === f ? 'bg-primary text-white' : 'bg-card text-muted-foreground hover:bg-muted'
              }`}
              style={{ fontSize: '0.75rem', fontWeight: 600 }}
            >
              {{ todos: 'Todos', aberto: 'Abertos', 'em-progresso': 'Em Progresso', resolvido: 'Resolvidos' }[f]}
            </button>
          ))}
        </div>
        <div className="flex rounded-xl overflow-hidden border border-border">
          {(['todos', 'critica', 'aviso', 'info'] as SevFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setSevFilter(f)}
              className={`px-3 py-1.5 transition-colors ${
                sevFilter === f ? 'bg-primary text-white' : 'bg-card text-muted-foreground hover:bg-muted'
              }`}
              style={{ fontSize: '0.75rem', fontWeight: 600 }}
            >
              {{ todos: 'Todas', critica: 'Crítica', aviso: 'Aviso', info: 'Info' }[f]}
            </button>
          ))}
        </div>
      </div>

      {issues.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <i className="fas fa-check-circle text-green-500 mb-2" style={{ fontSize: '2rem' }} aria-hidden="true"></i>
          <p className="text-foreground" style={{ fontWeight: 600 }}>Nenhuma ocorrência encontrada</p>
          <p className="text-muted-foreground mt-1" style={{ fontSize: '0.8rem' }}>
            Sem ocorrências com os filtros selecionados.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {issues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} onClick={() => onSelect(issue)} />
          ))}
        </div>
      )}
    </div>
  );
}

function IssueCard({ issue, onClick }: IssueCardProps) {
  const severityMap = {
    critica: { color: '#d4183d', label: 'Crítico' },
    aviso: { color: '#f59e0b', label: 'Aviso' },
    info: { color: '#3b82f6', label: 'Info' },
  };
  const typeMap = {
    sensor: { icon: 'fa-microchip', label: 'Sensor' },
    sistema: { icon: 'fa-server', label: 'Sistema' },
    cliente: { icon: 'fa-user', label: 'Cliente' },
  };
  const severityInfo = severityMap[issue.severidade];
  const typeInfo = typeMap[issue.tipo];

  const estadoBadge = ISSUE_STATUS_BADGES[issue.estado];

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card border border-border rounded-2xl p-4 hover:border-primary/40 hover:shadow-md transition-all"
      aria-label={`Ocorrência: ${issue.parque} – ${issue.descricao.slice(0, 50)}`}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: `${severityInfo.color}15` }}
          aria-hidden="true"
        >
          <i className={`fas ${typeInfo.icon}`} style={{ color: severityInfo.color, fontSize: '0.9rem' }}></i>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className="text-foreground" style={{ fontSize: '0.875rem', fontWeight: 700 }}>
              {issue.parque}
            </span>
            {issue.zona && (
              <span className="text-muted-foreground" style={{ fontSize: '0.72rem' }}>· {issue.zona}</span>
            )}
          </div>
          <p className="text-foreground/80" style={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
            {issue.descricao}
          </p>
          {issue.sensorId && (
            <p className="text-muted-foreground mt-1" style={{ fontSize: '0.7rem' }}>
              <i className="fas fa-tag mr-1" aria-hidden="true"></i>
              Sensor:{' '}
              <span style={{ fontFamily: 'monospace' }}>{issue.sensorId}</span>
            </p>
          )}
          {issue.matricula && (
            <p className="text-muted-foreground mt-1" style={{ fontSize: '0.7rem' }}>
              <i className="fas fa-car mr-1" aria-hidden="true"></i>
              Matrícula:{' '}
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{issue.matricula}</span>
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="px-1.5 py-0.5 rounded-full" style={{ fontSize: '0.65rem', fontWeight: 700, background: `${severityInfo.color}20`, color: severityInfo.color }}>
              {severityInfo.label}
            </span>
            <span className="px-1.5 py-0.5 rounded-full" style={{ fontSize: '0.65rem', fontWeight: 700, background: estadoBadge.bg, color: estadoBadge.color }}>
              {estadoBadge.label}
            </span>
            <span className="px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground" style={{ fontSize: '0.65rem', fontWeight: 600 }}>
              {typeInfo.label}
            </span>
            <span className="text-muted-foreground/70 ml-auto" style={{ fontSize: '0.65rem' }}>
              {new Date(issue.criadoEm).toLocaleString('pt-PT', {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>
          {issue.atribuidoA && (
            <p className="text-muted-foreground mt-1.5" style={{ fontSize: '0.7rem' }}>
              <i className="fas fa-user-gear mr-1" aria-hidden="true"></i>
              Atribuído a:{' '}
              <span style={{ fontWeight: 600 }}>{issue.atribuidoA}</span>
            </p>
          )}
        </div>
        <i className="fas fa-chevron-right text-muted-foreground/40 flex-shrink-0 mt-1" style={{ fontSize: '0.75rem' }} aria-hidden="true"></i>
      </div>
    </button>
  );
}
