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
