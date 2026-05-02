import type { IssueReport } from '../../../data/gestorData';

export function KpiCard({ icon, label, value, subValue, trend, color }: {
  icon: string; label: string; value: string; subValue: string;
  trend: 'up' | 'down' | 'warn' | 'neutral'; color: string;
}) {
  const trendColor =
    trend === 'up' ? '#22c55e' :
    trend === 'down' ? '#ef4444' :
    trend === 'warn' ? '#f59e0b' :
    'var(--color-muted-foreground)';
  const trendIcon =
    trend === 'up' ? 'fa-arrow-trend-up' :
    trend === 'down' ? 'fa-arrow-trend-down' :
    trend === 'warn' ? 'fa-triangle-exclamation' :
    'fa-minus';
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }} aria-hidden="true">
          <i className={`fas ${icon}`} style={{ color, fontSize: '1rem' }}></i>
        </div>
      </div>
      <p className="text-foreground" style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.1, marginTop: '0.25rem' }}>{value}</p>
      <p className="text-muted-foreground mt-0.5" style={{ fontSize: '0.72rem' }}>{label}</p>
      <div className="flex items-center gap-1 mt-1.5">
        <i className={`fas ${trendIcon}`} style={{ color: trendColor, fontSize: '0.65rem' }} aria-hidden="true"></i>
        <span style={{ fontSize: '0.7rem', color: trendColor, fontWeight: 600 }}>{subValue}</span>
      </div>
    </div>
  );
}

export function AlertRow({ issue }: { issue: IssueReport }) {
  const sevColor =
    issue.severidade === 'critica' ? '#d4183d' :
    issue.severidade === 'aviso' ? '#f59e0b' : '#3b82f6';
  const sevLabel =
    issue.severidade === 'critica' ? 'Crítico' :
    issue.severidade === 'aviso' ? 'Aviso' : 'Info';
  const tipoIcon =
    issue.tipo === 'sensor' ? 'fa-microchip' :
    issue.tipo === 'sistema' ? 'fa-server' : 'fa-user';
  const estadoBadge =
    issue.estado === 'aberto' ? { label: 'Aberto', color: '#d4183d', bg: '#d4183d20' } :
    issue.estado === 'em-progresso' ? { label: 'Em progresso', color: '#f59e0b', bg: '#f59e0b20' } :
    { label: 'Resolvido', color: '#22c55e', bg: '#22c55e20' };
  return (
    <div className="flex items-start gap-3 rounded-xl p-3 bg-muted/30 border border-border/50">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${sevColor}15` }} aria-hidden="true">
        <i className={`fas ${tipoIcon}`} style={{ color: sevColor, fontSize: '0.8rem' }}></i>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
          <span className="text-foreground" style={{ fontSize: '0.8rem', fontWeight: 600 }}>{issue.parque}</span>
          {issue.zona && <span className="text-muted-foreground" style={{ fontSize: '0.7rem' }}>· {issue.zona}</span>}
          <span className="px-1.5 py-0.5 rounded-full" style={{ fontSize: '0.62rem', fontWeight: 700, background: `${sevColor}20`, color: sevColor }}>{sevLabel}</span>
          <span className="px-1.5 py-0.5 rounded-full" style={{ fontSize: '0.62rem', fontWeight: 700, background: estadoBadge.bg, color: estadoBadge.color }}>{estadoBadge.label}</span>
        </div>
        <p className="text-muted-foreground truncate" style={{ fontSize: '0.72rem' }}>{issue.descricao}</p>
        <p className="text-muted-foreground/70 mt-0.5" style={{ fontSize: '0.65rem' }}>
          {new Date(issue.criadoEm).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          {issue.atribuidoA ? ` · ${issue.atribuidoA}` : ''}
        </p>
      </div>
    </div>
  );
}

export function OccBar({ pct }: { pct: number }) {
  const color = pct >= 85 ? '#d4183d' : pct >= 65 ? '#f59e0b' : '#22c55e';
  return (
    <div className="flex items-center gap-2 justify-center">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden" style={{ maxWidth: 80 }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span style={{ fontSize: '0.75rem', fontWeight: 600, color }}>{pct}%</span>
    </div>
  );
}

export function TabBtn({
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

export function QuickStat({
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

export function LegendBadge({ color, label }: { color: string; label: string }) {
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

export function InfoField({
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

export function TariffInputRow({
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
