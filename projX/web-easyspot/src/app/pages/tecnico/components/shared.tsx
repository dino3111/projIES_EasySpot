export function TabBtn({
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

export function QuickStat({ label, value, color, icon, active }: {
  label: string; value: number; color: string; icon: string; active?: boolean;
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

export function EmptyState({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-8 text-center">
      <i className={`fas ${icon} text-green-500 mb-2`} style={{ fontSize: '2rem' }} aria-hidden="true"></i>
      <p className="text-foreground" style={{ fontWeight: 600 }}>{title}</p>
      <p className="text-muted-foreground mt-1" style={{ fontSize: '0.8rem' }}>{desc}</p>
    </div>
  );
}

export function MetaRow({ label, value, mono, color }: { label: string; value: string; mono?: boolean; color?: string }) {
  return (
    <div>
      <p className="text-muted-foreground" style={{ fontSize: '0.68rem', fontWeight: 500 }}>{label}</p>
      <p className="text-foreground" style={{ fontSize: '0.78rem', fontWeight: 600, fontFamily: mono ? 'monospace' : undefined, color }}>{value}</p>
    </div>
  );
}

export function StatBadge({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div className="rounded-lg p-2 flex flex-col items-center justify-center" style={{ background: `${color}15` }}>
      <i className={`fas ${icon}`} style={{ color, fontSize: '0.85rem' }} aria-hidden="true"></i>
      <span style={{ fontSize: '0.65rem', fontWeight: 700, color, marginTop: '0.25rem' }}>{value}</span>
      <span style={{ fontSize: '0.6rem', color: 'var(--color-muted-foreground)' }}>{label}</span>
    </div>
  );
}

export function TechMapLegend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: color }} aria-hidden="true" />
      <span className="text-muted-foreground" style={{ fontSize: '0.65rem' }}>{label}</span>
    </div>
  );
}
