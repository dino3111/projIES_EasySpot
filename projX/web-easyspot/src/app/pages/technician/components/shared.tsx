export function KpiCard({ icon, label, value, subValue, trend, color }: {
  readonly icon: string; readonly label: string; readonly value: string; readonly subValue: string;
  readonly trend: 'up' | 'down' | 'warn' | 'neutral'; readonly color: string;
}) {
  const trendMap = {
    up: { color: '#22c55e', icon: 'fa-arrow-trend-up' },
    down: { color: '#ef4444', icon: 'fa-arrow-trend-down' },
    warn: { color: '#f59e0b', icon: 'fa-triangle-exclamation' },
    neutral: { color: 'var(--color-muted-foreground)', icon: 'fa-minus' },
  };
  const trendInfo = trendMap[trend];
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }} aria-hidden="true">
          <i className={`fas ${icon}`} style={{ color, fontSize: '1rem' }}></i>
        </div>
      </div>
      <p className="text-foreground" style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.1, marginTop: '0.25rem' }}>{value}</p>
      <p className="text-muted-foreground mt-0.5" style={{ fontSize: '0.72rem', fontWeight: 600 }}>{label}</p>
      <div className="flex items-center gap-1 mt-1.5">
        <i className={`fas ${trendInfo.icon}`} style={{ color: trendInfo.color, fontSize: '0.65rem' }} aria-hidden="true"></i>
        <span style={{ fontSize: '0.7rem', color: trendInfo.color }}>{subValue}</span>
      </div>
    </div>
  );
}

export function TabBtn({
  active, onClick, icon, label, badge,
}: {
  readonly active: boolean; readonly onClick: () => void; readonly icon: string; readonly label: string; readonly badge?: number;
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

export function QuickStat({ label, value, color, icon, active }: {
  readonly label: string; readonly value: number; readonly color: string; readonly icon: string; readonly active?: boolean;
}) {
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

export function EmptyState({ icon, title, desc }: { readonly icon: string; readonly title: string; readonly desc: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-8 text-center">
      <i className={`fas ${icon} text-green-500 mb-2`} style={{ fontSize: '2rem' }} aria-hidden="true"></i>
      <p className="text-foreground" style={{ fontWeight: 600 }}>{title}</p>
      <p className="text-muted-foreground mt-1" style={{ fontSize: '0.8rem' }}>{desc}</p>
    </div>
  );
}

export function MetaRow({ label, value, mono, color }: { readonly label: string; readonly value: string; readonly mono?: boolean; readonly color?: string }) {
  return (
    <div>
      <p className="text-muted-foreground" style={{ fontSize: '0.68rem', fontWeight: 500 }}>{label}</p>
      <p className="text-foreground" style={{ fontSize: '0.78rem', fontWeight: 600, fontFamily: mono ? 'monospace' : undefined, color }}>{value}</p>
    </div>
  );
}

export function StatBadge({ label, value, color, icon }: { readonly label: string; readonly value: number; readonly color: string; readonly icon: string }) {
  return (
    <div className="rounded-lg p-2 flex flex-col items-center justify-center" style={{ background: `${color}15` }}>
      <i className={`fas ${icon}`} style={{ color, fontSize: '0.85rem' }} aria-hidden="true"></i>
      <span style={{ fontSize: '0.65rem', fontWeight: 700, color, marginTop: '0.25rem' }}>{value}</span>
      <span style={{ fontSize: '0.6rem', color: 'var(--color-muted-foreground)' }}>{label}</span>
    </div>
  );
}

export function TechMapLegend({ color, label }: { readonly color: string; readonly label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: color }} aria-hidden="true" />
      <span className="text-muted-foreground" style={{ fontSize: '0.65rem' }}>{label}</span>
    </div>
  );
}
