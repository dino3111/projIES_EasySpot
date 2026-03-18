import type { IssueReport } from '../../../data/gestorData';
import { InfoField } from './shared';

export function IssueModal({ issue, onClose }: { issue: IssueReport; onClose: () => void }) {
  const sevColor =
    issue.severidade === 'critica' ? '#d4183d' :
    issue.severidade === 'aviso' ? '#f59e0b' : '#3b82f6';
  const tipoIcon =
    issue.tipo === 'sensor' ? 'fa-microchip' :
    issue.tipo === 'sistema' ? 'fa-server' : 'fa-user';

  const estadoBadge =
    issue.estado === 'aberto' ? { label: 'Aberto', color: '#d4183d', bg: '#d4183d20' } :
    issue.estado === 'em-progresso' ? { label: 'Em Progresso', color: '#f59e0b', bg: '#f59e0b20' } :
    { label: 'Resolvido', color: '#22c55e', bg: '#22c55e20' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhe da ocorrência: ${issue.parque}`}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
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

        <div className="flex flex-wrap gap-2 mb-4">
          <span className="px-2 py-1 rounded-full" style={{ fontSize: '0.72rem', fontWeight: 700, background: `${sevColor}20`, color: sevColor }}>
            {issue.severidade === 'critica' ? 'Crítico' : issue.severidade === 'aviso' ? 'Aviso' : 'Info'}
          </span>
          <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
            {issue.tipo === 'sensor' ? 'Sensor' : issue.tipo === 'sistema' ? 'Sistema' : 'Cliente'}
          </span>
          <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
            {new Date(issue.criadoEm).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className="bg-muted/40 rounded-xl p-4 mb-4">
          <p className="text-foreground" style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
            {issue.descricao}
          </p>
        </div>

        {(issue.sensorId || issue.matricula) && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {issue.sensorId && <InfoField icon="fa-microchip" label="ID Sensor" value={issue.sensorId} mono />}
            {issue.matricula && <InfoField icon="fa-car" label="Matrícula" value={issue.matricula} mono />}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-foreground mb-1.5" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
            Estado da Ocorrência
          </label>
          <div className="px-3 py-2 rounded-xl border border-border bg-muted/30" style={{ fontSize: '0.85rem', fontWeight: 600, color: estadoBadge.color }}>
            <span style={{ display: 'inline-block', background: estadoBadge.bg, padding: '0.25rem 0.75rem', borderRadius: '0.5rem' }}>
              {estadoBadge.label}
            </span>
          </div>
          <p className="text-muted-foreground text-xs mt-2">
            <i className="fas fa-info-circle mr-1" aria-hidden="true"></i>
            Alterado pelo técnico responsável
          </p>
        </div>

        {issue.atribuidoA && (
          <div className="mb-4">
            <label className="block text-foreground mb-1.5" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
              Atribuído a
            </label>
            <div className="px-3 py-2 rounded-xl border border-border bg-muted/30 text-foreground" style={{ fontSize: '0.85rem' }}>
              <i className="fas fa-user-circle mr-1.5 text-primary" aria-hidden="true"></i>
              {issue.atribuidoA}
            </div>
          </div>
        )}

        {issue.notas && (
          <div className="mb-5">
            <label className="block text-foreground mb-1.5" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
              Notas Técnicas
            </label>
            <div className="px-3 py-2 rounded-xl border border-border bg-muted/30 text-foreground" style={{ fontSize: '0.85rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {issue.notas}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-border bg-muted/40 text-muted-foreground hover:bg-muted transition-colors"
            style={{ fontSize: '0.85rem', fontWeight: 600 }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
