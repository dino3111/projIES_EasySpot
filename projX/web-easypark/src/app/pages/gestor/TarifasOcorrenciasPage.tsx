import { useState } from 'react';
import {
  mockTariffs,
  mockIssues,
  mockBillingRecords,
  type IssueReport,
  type TariffEntry,
  type BillingRecord,
} from '../../data/gestorData';

type PageTab = 'tarifas' | 'ocorrencias' | 'faturacao';
type IssueFilter = 'todos' | 'aberto' | 'em-progresso' | 'resolvido';
type SevFilter = 'todos' | 'critica' | 'aviso' | 'info';

export function TarifasOcorrenciasPage() {
  const [tab, setTab] = useState<PageTab>('tarifas');
  const [issueFilter, setIssueFilter] = useState<IssueFilter>('todos');
  const [sevFilter, setSevFilter] = useState<SevFilter>('todos');
  const [selectedIssue, setSelectedIssue] = useState<IssueReport | null>(null);
  const [editTariff, setEditTariff] = useState<TariffEntry | null>(null);

  const filteredIssues = mockIssues.filter((i) => {
    const estadoOk = issueFilter === 'todos' || i.estado === issueFilter;
    const sevOk = sevFilter === 'todos' || i.severidade === sevFilter;
    return estadoOk && sevOk;
  });

  return (
    <div className="px-4 py-5 max-w-screen-xl mx-auto space-y-5">

      {/* ── Cabeçalho ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1
            className="text-foreground"
            style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.2 }}
          >
            Tarifas &amp; Ocorrências
          </h1>
          <p className="text-muted-foreground mt-1" style={{ fontSize: '0.875rem' }}>
            Gestão de tarifários, faturação e registo de problemas
          </p>
        </div>
        <button
          className="self-start sm:self-auto flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border hover:bg-muted transition-colors text-foreground"
          style={{ fontSize: '0.8rem', fontWeight: 600 }}
          aria-label="Exportar dados"
        >
          <i className="fas fa-file-export text-primary" style={{ fontSize: '0.85rem' }} aria-hidden="true"></i>
          Exportar
        </button>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Secções de tarifas e ocorrências"
        className="flex gap-0 bg-muted rounded-xl p-1 w-full sm:w-auto sm:inline-flex"
      >
        <TabBtn active={tab === 'tarifas'} onClick={() => setTab('tarifas')} icon="fa-file-invoice-dollar" label="Tarifários" />
        <TabBtn active={tab === 'ocorrencias'} onClick={() => setTab('ocorrencias')} icon="fa-triangle-exclamation" label="Ocorrências" badge={mockIssues.filter(i => i.estado === 'aberto').length} />
        <TabBtn active={tab === 'faturacao'} onClick={() => setTab('faturacao')} icon="fa-receipt" label="Faturação" />
      </div>

      {/* ── Conteúdo por tab ─────────────────────────────────────────── */}
      {tab === 'tarifas' && (
        <TarifasTab onEdit={setEditTariff} />
      )}
      {tab === 'ocorrencias' && (
        <OcorrenciasTab
          issues={filteredIssues}
          issueFilter={issueFilter}
          setIssueFilter={setIssueFilter}
          sevFilter={sevFilter}
          setSevFilter={setSevFilter}
          onSelect={setSelectedIssue}
        />
      )}
      {tab === 'faturacao' && (
        <FaturacaoTab />
      )}

      {/* ── Modal de detalhe de ocorrência ───────────────────────────── */}
      {selectedIssue && (
        <IssueModal issue={selectedIssue} onClose={() => setSelectedIssue(null)} />
      )}

      {/* ── Modal de edição de tarifa ─────────────────────────────────── */}
      {editTariff && (
        <TariffModal tariff={editTariff} onClose={() => setEditTariff(null)} />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TAB: TARIFÁRIOS
// ────────────────────────────────────────────────────────────────────────────

function TarifasTab({ onEdit }: { onEdit: (t: TariffEntry) => void }) {
  return (
    <div className="space-y-4">
      {/* Legenda de estados */}
      <div className="flex flex-wrap gap-2">
        <LegendBadge color="#22c55e" label="Ativo" />
        <LegendBadge color="#f59e0b" label="Em Revisão" />
        <LegendBadge color="#9ca3af" label="Suspenso" />
      </div>

      {/* Tabela */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: '0.82rem', minWidth: '680px' }}>
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left text-muted-foreground px-4 py-3" style={{ fontWeight: 600 }}>Parque</th>
                <th className="text-left text-muted-foreground px-3 py-3" style={{ fontWeight: 600 }}>Cidade</th>
                <th className="text-center text-muted-foreground px-3 py-3" style={{ fontWeight: 600 }}>€/hora</th>
                <th className="text-center text-muted-foreground px-3 py-3" style={{ fontWeight: 600 }}>Máx. Dia</th>
                <th className="text-center text-muted-foreground px-3 py-3" style={{ fontWeight: 600 }}>Mensal</th>
                <th className="text-center text-muted-foreground px-3 py-3" style={{ fontWeight: 600 }}>EV (€/kWh)</th>
                <th className="text-center text-muted-foreground px-3 py-3" style={{ fontWeight: 600 }}>Estado</th>
                <th className="text-right text-muted-foreground px-4 py-3" style={{ fontWeight: 600 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {mockTariffs.map((t) => (
                <TariffRow key={t.parqueId} tariff={t} onEdit={onEdit} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-muted-foreground" style={{ fontSize: '0.72rem' }}>
        <i className="fas fa-info-circle mr-1" aria-hidden="true"></i>
        As alterações de tarifário requerem aprovação antes de entrarem em vigor.
        Última sincronização: 09/03/2026 às 08:00.
      </p>
    </div>
  );
}

function TariffRow({ tariff, onEdit }: { tariff: TariffEntry; onEdit: (t: TariffEntry) => void }) {
  const statusColor =
    tariff.estado === 'ativo' ? '#22c55e' :
    tariff.estado === 'revisao' ? '#f59e0b' : '#9ca3af';
  const statusLabel =
    tariff.estado === 'ativo' ? 'Ativo' :
    tariff.estado === 'revisao' ? 'Revisão' : 'Suspenso';

  return (
    <tr className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3 text-foreground" style={{ fontWeight: 600 }}>{tariff.parqueNome}</td>
      <td className="px-3 py-3 text-muted-foreground">{tariff.cidade}</td>
      <td className="px-3 py-3 text-center text-foreground">€{tariff.tarifaHora.toFixed(2)}</td>
      <td className="px-3 py-3 text-center text-foreground">€{tariff.maxDiario.toFixed(2)}</td>
      <td className="px-3 py-3 text-center text-foreground">€{tariff.mensalidade.toFixed(2)}</td>
      <td className="px-3 py-3 text-center">
        {tariff.tarifaEV ? (
          <span className="text-green-600 dark:text-green-400" style={{ fontWeight: 600 }}>
            €{tariff.tarifaEV.toFixed(2)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 py-3 text-center">
        <span
          className="px-2 py-0.5 rounded-full"
          style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            background: `${statusColor}20`,
            color: statusColor,
          }}
        >
          {statusLabel}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={() => onEdit(tariff)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
          style={{ fontSize: '0.72rem', fontWeight: 600 }}
          aria-label={`Editar tarifário de ${tariff.parqueNome}`}
        >
          <i className="fas fa-pen" style={{ fontSize: '0.65rem' }} aria-hidden="true"></i>
          Editar
        </button>
      </td>
    </tr>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TAB: OCORRÊNCIAS
// ────────────────────────────────────────────────────────────────────────────

function OcorrenciasTab({
  issues,
  issueFilter,
  setIssueFilter,
  sevFilter,
  setSevFilter,
  onSelect,
}: {
  issues: IssueReport[];
  issueFilter: IssueFilter;
  setIssueFilter: (f: IssueFilter) => void;
  sevFilter: SevFilter;
  setSevFilter: (f: SevFilter) => void;
  onSelect: (i: IssueReport) => void;
}) {
  const estadoCounts = {
    aberto: mockIssues.filter(i => i.estado === 'aberto').length,
    'em-progresso': mockIssues.filter(i => i.estado === 'em-progresso').length,
    resolvido: mockIssues.filter(i => i.estado === 'resolvido').length,
  };

  return (
    <div className="space-y-4">
      {/* Resumo rápido */}
      <div className="grid grid-cols-3 gap-3">
        <QuickStat
          label="Em Aberto"
          value={estadoCounts.aberto}
          color="#d4183d"
          icon="fa-circle-exclamation"
        />
        <QuickStat
          label="Em Progresso"
          value={estadoCounts['em-progresso']}
          color="#f59e0b"
          icon="fa-spinner"
        />
        <QuickStat
          label="Resolvidos"
          value={estadoCounts.resolvido}
          color="#22c55e"
          icon="fa-circle-check"
        />
      </div>

      {/* Filtros */}
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
              {f === 'todos' ? 'Todos' : f === 'aberto' ? 'Abertos' : f === 'em-progresso' ? 'Em Progresso' : 'Resolvidos'}
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
              {f === 'todos' ? 'Todas' : f === 'critica' ? 'Crítica' : f === 'aviso' ? 'Aviso' : 'Info'}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de ocorrências */}
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

function IssueCard({ issue, onClick }: { issue: IssueReport; onClick: () => void }) {
  const sevColor =
    issue.severidade === 'critica' ? '#d4183d' :
    issue.severidade === 'aviso' ? '#f59e0b' : '#3b82f6';
  const sevLabel =
    issue.severidade === 'critica' ? 'Crítico' :
    issue.severidade === 'aviso' ? 'Aviso' : 'Info';
  const tipoIcon =
    issue.tipo === 'sensor' ? 'fa-microchip' :
    issue.tipo === 'sistema' ? 'fa-server' : 'fa-user';
  const tipoLabel =
    issue.tipo === 'sensor' ? 'Sensor' :
    issue.tipo === 'sistema' ? 'Sistema' : 'Cliente';

  const estadoBadge =
    issue.estado === 'aberto' ? { label: 'Aberto', color: '#d4183d', bg: '#d4183d20' } :
    issue.estado === 'em-progresso' ? { label: 'Em progresso', color: '#f59e0b', bg: '#f59e0b20' } :
    { label: 'Resolvido', color: '#22c55e', bg: '#22c55e20' };

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card border border-border rounded-2xl p-4 hover:border-primary/40 hover:shadow-md transition-all"
      aria-label={`Ocorrência: ${issue.parque} – ${issue.descricao.slice(0, 50)}`}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: `${sevColor}15` }}
          aria-hidden="true"
        >
          <i className={`fas ${tipoIcon}`} style={{ color: sevColor, fontSize: '0.9rem' }}></i>
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
              Sensor: <span style={{ fontFamily: 'monospace' }}>{issue.sensorId}</span>
            </p>
          )}
          {issue.matricula && (
            <p className="text-muted-foreground mt-1" style={{ fontSize: '0.7rem' }}>
              <i className="fas fa-car mr-1" aria-hidden="true"></i>
              Matrícula: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{issue.matricula}</span>
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span
              className="px-1.5 py-0.5 rounded-full"
              style={{ fontSize: '0.65rem', fontWeight: 700, background: `${sevColor}20`, color: sevColor }}
            >
              {sevLabel}
            </span>
            <span
              className="px-1.5 py-0.5 rounded-full"
              style={{ fontSize: '0.65rem', fontWeight: 700, background: estadoBadge.bg, color: estadoBadge.color }}
            >
              {estadoBadge.label}
            </span>
            <span
              className="px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
              style={{ fontSize: '0.65rem', fontWeight: 600 }}
            >
              {tipoLabel}
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
              Atribuído a: <span style={{ fontWeight: 600 }}>{issue.atribuidoA}</span>
            </p>
          )}
        </div>
        <i className="fas fa-chevron-right text-muted-foreground/40 flex-shrink-0 mt-1" style={{ fontSize: '0.75rem' }} aria-hidden="true"></i>
      </div>
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TAB: FATURAÇÃO
// ────────────────────────────────────────────────────────────────────────────

function FaturacaoTab() {
  const totalPago = mockBillingRecords.filter(r => r.estado === 'pago').reduce((s, r) => s + r.total, 0);
  const totalPendente = mockBillingRecords.filter(r => r.estado === 'pendente').reduce((s, r) => s + r.total, 0);
  const totalContestado = mockBillingRecords.filter(r => r.estado === 'contestado').reduce((s, r) => s + r.total, 0);

  return (
    <div className="space-y-4">
      {/* Totais */}
      <div className="grid grid-cols-3 gap-3">
        <QuickStat label="Pago" value={`€${totalPago.toFixed(2)}`} color="#22c55e" icon="fa-circle-check" />
        <QuickStat label="Pendente" value={`€${totalPendente.toFixed(2)}`} color="#f59e0b" icon="fa-hourglass-half" />
        <QuickStat label="Contestado" value={`€${totalContestado.toFixed(2)}`} color="#d4183d" icon="fa-circle-xmark" />
      </div>

      {/* Tabela de registos */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: '0.8rem', minWidth: '680px' }}>
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left text-muted-foreground px-4 py-3" style={{ fontWeight: 600 }}>Parque</th>
                <th className="text-left text-muted-foreground px-3 py-3" style={{ fontWeight: 600 }}>Data/Hora</th>
                <th className="text-left text-muted-foreground px-3 py-3" style={{ fontWeight: 600 }}>Matrícula</th>
                <th className="text-center text-muted-foreground px-3 py-3" style={{ fontWeight: 600 }}>Método</th>
                <th className="text-center text-muted-foreground px-3 py-3" style={{ fontWeight: 600 }}>Duração</th>
                <th className="text-right text-muted-foreground px-3 py-3" style={{ fontWeight: 600 }}>Estac.</th>
                <th className="text-right text-muted-foreground px-3 py-3" style={{ fontWeight: 600 }}>EV</th>
                <th className="text-right text-muted-foreground px-3 py-3" style={{ fontWeight: 600 }}>Total</th>
                <th className="text-center text-muted-foreground px-4 py-3" style={{ fontWeight: 600 }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {mockBillingRecords.map((record) => (
                <BillingRow key={record.id} record={record} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-muted-foreground" style={{ fontSize: '0.72rem' }}>
        <i className="fas fa-info-circle mr-1" aria-hidden="true"></i>
        A cobrança é realizada automaticamente via leitura de matrícula OCR ou identificador RFID (Via Verde).
        Registos dos últimos 2 dias.
      </p>
    </div>
  );
}

function BillingRow({ record }: { record: BillingRecord }) {
  const estadoColor =
    record.estado === 'pago' ? '#22c55e' :
    record.estado === 'pendente' ? '#f59e0b' : '#d4183d';
  const estadoLabel =
    record.estado === 'pago' ? 'Pago' :
    record.estado === 'pendente' ? 'Pendente' : 'Contestado';
  const metodoIcon =
    record.metodo === 'RFID' ? 'fa-wifi' :
    record.metodo === 'OCR' ? 'fa-camera' : 'fa-user';

  return (
    <tr className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3 text-foreground" style={{ fontWeight: 500 }}>{record.parqueNome}</td>
      <td className="px-3 py-3 text-muted-foreground" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
        {record.data}
      </td>
      <td className="px-3 py-3">
        <span
          className="px-2 py-0.5 rounded-lg bg-muted text-foreground"
          style={{ fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 700 }}
        >
          {record.matricula}
        </span>
      </td>
      <td className="px-3 py-3 text-center">
        <span className="flex items-center justify-center gap-1">
          <i className={`fas ${metodoIcon} text-primary`} style={{ fontSize: '0.75rem' }} aria-hidden="true"></i>
          <span className="text-muted-foreground">{record.metodo}</span>
        </span>
      </td>
      <td className="px-3 py-3 text-center text-muted-foreground">{record.duracao}</td>
      <td className="px-3 py-3 text-right text-foreground">€{record.valorEstacionamento.toFixed(2)}</td>
      <td className="px-3 py-3 text-right">
        {record.valorEV ? (
          <span className="text-green-600 dark:text-green-400">€{record.valorEV.toFixed(2)}</span>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        )}
      </td>
      <td className="px-3 py-3 text-right text-foreground" style={{ fontWeight: 700 }}>
        €{record.total.toFixed(2)}
      </td>
      <td className="px-4 py-3 text-center">
        <span
          className="px-2 py-0.5 rounded-full"
          style={{ fontSize: '0.68rem', fontWeight: 700, background: `${estadoColor}20`, color: estadoColor }}
        >
          {estadoLabel}
        </span>
      </td>
    </tr>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// MODAIS
// ────────────────────────────────────────────────────────────────────────────

function IssueModal({ issue, onClose }: { issue: IssueReport; onClose: () => void }) {
  const [notes, setNotes] = useState(issue.notas || '');
  const [assignee, setAssignee] = useState(issue.atribuidoA || '');
  const [status, setStatus] = useState(issue.estado);

  const sevColor =
    issue.severidade === 'critica' ? '#d4183d' :
    issue.severidade === 'aviso' ? '#f59e0b' : '#3b82f6';
  const tipoIcon =
    issue.tipo === 'sensor' ? 'fa-microchip' :
    issue.tipo === 'sistema' ? 'fa-server' : 'fa-user';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhe da ocorrência: ${issue.parque}`}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Cabeçalho */}
        <div className="flex items-start gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${sevColor}15` }}
            aria-hidden="true"
          >
            <i className={`fas ${tipoIcon}`} style={{ color: sevColor, fontSize: '1rem' }}></i>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-foreground" style={{ fontSize: '1.05rem', fontWeight: 800 }}>
              {issue.parque}
            </h2>
            {issue.zona && (
              <p className="text-muted-foreground" style={{ fontSize: '0.78rem' }}>{issue.zona}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
            aria-label="Fechar"
          >
            <i className="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span
            className="px-2 py-1 rounded-full"
            style={{
              fontSize: '0.72rem', fontWeight: 700,
              background: `${sevColor}20`, color: sevColor,
            }}
          >
            {issue.severidade === 'critica' ? 'Crítico' : issue.severidade === 'aviso' ? 'Aviso' : 'Info'}
          </span>
          <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
            {issue.tipo === 'sensor' ? 'Sensor' : issue.tipo === 'sistema' ? 'Sistema' : 'Cliente'}
          </span>
          <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
            {new Date(issue.criadoEm).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Descrição */}
        <div className="bg-muted/40 rounded-xl p-4 mb-4">
          <p className="text-foreground" style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
            {issue.descricao}
          </p>
        </div>

        {/* Detalhes técnicos */}
        {(issue.sensorId || issue.matricula) && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {issue.sensorId && (
              <InfoField icon="fa-microchip" label="ID Sensor" value={issue.sensorId} mono />
            )}
            {issue.matricula && (
              <InfoField icon="fa-car" label="Matrícula" value={issue.matricula} mono />
            )}
          </div>
        )}

        {/* Estado */}
        <div className="mb-4">
          <label className="block text-foreground mb-1.5" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
            Estado da Ocorrência
          </label>
          <div className="flex gap-2">
            {(['aberto', 'em-progresso', 'resolvido'] as const).map((s) => {
              const c = s === 'aberto' ? '#d4183d' : s === 'em-progresso' ? '#f59e0b' : '#22c55e';
              const l = s === 'aberto' ? 'Aberto' : s === 'em-progresso' ? 'Em Progresso' : 'Resolvido';
              return (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className="flex-1 py-2 rounded-xl border-2 transition-all"
                  style={{
                    fontSize: '0.72rem', fontWeight: 700,
                    borderColor: status === s ? c : 'var(--color-border)',
                    background: status === s ? `${c}20` : 'transparent',
                    color: status === s ? c : 'var(--color-muted-foreground)',
                  }}
                >
                  {l}
                </button>
              );
            })}
          </div>
        </div>

        {/* Atribuição */}
        <div className="mb-4">
          <label htmlFor="assignee-input" className="block text-foreground mb-1.5" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
            Atribuir a
          </label>
          <input
            id="assignee-input"
            type="text"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            placeholder="Nome do técnico ou equipa"
            className="w-full px-3 py-2 rounded-xl border border-border bg-muted/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            style={{ fontSize: '0.85rem' }}
          />
        </div>

        {/* Notas */}
        <div className="mb-5">
          <label htmlFor="notes-input" className="block text-foreground mb-1.5" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
            Notas Técnicas
          </label>
          <textarea
            id="notes-input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Adicione notas de diagnóstico ou resolução..."
            rows={3}
            className="w-full px-3 py-2 rounded-xl border border-border bg-muted/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none"
            style={{ fontSize: '0.85rem' }}
          />
        </div>

        {/* Ações */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border bg-muted/40 text-muted-foreground hover:bg-muted transition-colors"
            style={{ fontSize: '0.85rem', fontWeight: 600 }}
          >
            Cancelar
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white hover:opacity-90 transition-opacity"
            style={{ fontSize: '0.85rem', fontWeight: 700 }}
          >
            <i className="fas fa-save mr-1.5" aria-hidden="true"></i>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function TariffModal({ tariff, onClose }: { tariff: TariffEntry; onClose: () => void }) {
  const [hora, setHora] = useState(tariff.tarifaHora.toString());
  const [maxDia, setMaxDia] = useState(tariff.maxDiario.toString());
  const [mensal, setMensal] = useState(tariff.mensalidade.toString());
  const [ev, setEv] = useState(tariff.tarifaEV?.toString() || '');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Editar tarifário: ${tariff.parqueNome}`}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-foreground" style={{ fontSize: '1.05rem', fontWeight: 800 }}>
              Editar Tarifário
            </h2>
            <p className="text-muted-foreground" style={{ fontSize: '0.78rem' }}>
              {tariff.parqueNome} · {tariff.cidade}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
            aria-label="Fechar"
          >
            <i className="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </div>

        <div className="space-y-3 mb-5">
          <TariffInputRow
            id="tarifa-hora"
            label="Tarifa por Hora (€)"
            icon="fa-clock"
            value={hora}
            onChange={setHora}
          />
          <TariffInputRow
            id="max-diario"
            label="Máximo Diário (€)"
            icon="fa-sun"
            value={maxDia}
            onChange={setMaxDia}
          />
          <TariffInputRow
            id="mensalidade"
            label="Mensalidade (€)"
            icon="fa-calendar"
            value={mensal}
            onChange={setMensal}
          />
          <TariffInputRow
            id="tarifa-ev"
            label="Tarifa EV (€/kWh)"
            icon="fa-charging-station"
            value={ev}
            onChange={setEv}
            optional
          />
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-5">
          <p className="text-yellow-600 dark:text-yellow-400" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
            <i className="fas fa-triangle-exclamation mr-1.5" aria-hidden="true"></i>
            As alterações entram em vigor após aprovação.
            Clientes com subscrições ativas serão notificados.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border bg-muted/40 text-muted-foreground hover:bg-muted transition-colors"
            style={{ fontSize: '0.85rem', fontWeight: 600 }}
          >
            Cancelar
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white hover:opacity-90 transition-opacity"
            style={{ fontSize: '0.85rem', fontWeight: 700 }}
          >
            <i className="fas fa-paper-plane mr-1.5" aria-hidden="true"></i>
            Submeter para Revisão
          </button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Pequenos componentes auxiliares
// ────────────────────────────────────────────────────────────────────────────

function TabBtn({
  active, onClick, icon, label, badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  badge?: number;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition-colors relative ${
        active ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
      }`}
      style={{ fontSize: '0.8rem', fontWeight: 600 }}
    >
      <i className={`fas ${icon}`} style={{ fontSize: '0.8rem' }} aria-hidden="true"></i>
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{label.split(' ')[0]}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-white flex items-center justify-center"
          style={{ fontSize: '0.6rem', fontWeight: 800 }}
          aria-label={`${badge} em aberto`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function QuickStat({
  label, value, color, icon,
}: {
  label: string;
  value: string | number;
  color: string;
  icon: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-3 flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}15` }}
        aria-hidden="true"
      >
        <i className={`fas ${icon}`} style={{ color, fontSize: '0.9rem' }}></i>
      </div>
      <div>
        <p className="text-foreground" style={{ fontSize: '1.1rem', fontWeight: 800, lineHeight: 1 }}>{value}</p>
        <p className="text-muted-foreground" style={{ fontSize: '0.7rem' }}>{label}</p>
      </div>
    </div>
  );
}

function LegendBadge({ color, label }: { color: string; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border"
      style={{ fontSize: '0.72rem', fontWeight: 600, borderColor: `${color}40`, color, background: `${color}10` }}
    >
      <span className="w-2 h-2 rounded-full" style={{ background: color }} aria-hidden="true" />
      {label}
    </span>
  );
}

function InfoField({
  icon, label, value, mono = false,
}: {
  icon: string;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="bg-muted/40 rounded-xl p-3">
      <p className="text-muted-foreground mb-0.5" style={{ fontSize: '0.7rem' }}>
        <i className={`fas ${icon} mr-1`} aria-hidden="true"></i>
        {label}
      </p>
      <p
        className="text-foreground"
        style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: mono ? 'monospace' : undefined }}
      >
        {value}
      </p>
    </div>
  );
}

function TariffInputRow({
  id, label, icon, value, onChange, optional = false,
}: {
  id: string;
  label: string;
  icon: string;
  value: string;
  onChange: (v: string) => void;
  optional?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="flex items-center gap-1.5 text-foreground mb-1" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
        <i className={`fas ${icon} text-primary`} style={{ fontSize: '0.75rem', width: '14px' }} aria-hidden="true"></i>
        {label}
        {optional && <span className="text-muted-foreground" style={{ fontSize: '0.7rem' }}>(opcional)</span>}
      </label>
      <input
        id={id}
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-xl border border-border bg-muted/30 text-foreground focus:outline-none focus:border-primary transition-colors"
        style={{ fontSize: '0.9rem' }}
      />
    </div>
  );
}
