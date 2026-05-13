import { Link } from 'react-router';

export function SectionHeader({ icon, title }: Readonly<{ icon: string; title: string }>) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <i className={`fas ${icon} text-primary`} style={{ fontSize: '0.9rem' }} />
      <h2 className="text-foreground font-bold" style={{ fontSize: '0.95rem' }}>{title}</h2>
    </div>
  );
}

export function UserTypeOption({ id, icon, label, desc, selected, onChange }: Readonly<{
  id: string; icon: string; label: string; desc: string; selected: boolean; onChange: () => void;
}>) {
  return (
    <label htmlFor={id} className={`flex items-center gap-3 rounded-xl p-3 cursor-pointer transition-all border ${
      selected ? 'bg-primary/10 border-primary' : 'bg-background border-border hover:bg-black/5 dark:hover:bg-white/5'
    }`}>
      <input type="radio" id={id} name="userType" className="sr-only" checked={selected} onChange={onChange} />
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${selected ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
        <i className={`fas ${icon}`} style={{ fontSize: '0.9rem' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-foreground font-bold" style={{ fontSize: '0.875rem' }}>{label}</p>
        <p className="text-muted-foreground" style={{ fontSize: '0.72rem', lineHeight: 1.4 }}>{desc}</p>
      </div>
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selected ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`}>
        {selected && <div className="w-2 h-2 rounded-full bg-white" />}
      </div>
    </label>
  );
}

export function ToggleRow({ icon, label, desc, value, onChange, id }: Readonly<{
  icon: string; label: string; desc: string; value: boolean; onChange: (v: boolean) => void; id: string;
}>) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary/10">
        <i className={`fas ${icon} text-primary`} style={{ fontSize: '0.9rem' }} />
      </div>
      <div className="flex-1 min-w-0">
        <label htmlFor={id} className="text-foreground font-semibold cursor-pointer block" style={{ fontSize: '0.875rem' }}>{label}</label>
        <p className="text-muted-foreground" style={{ fontSize: '0.72rem', lineHeight: 1.4 }}>{desc}</p>
      </div>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={value}
        aria-label={label}
        onClick={() => onChange(!value)}
        className={`flex-shrink-0 rounded-full transition-all duration-200 relative w-11 h-6 cursor-pointer ${value ? 'bg-primary' : 'bg-muted'}`}
      >
        <span className={`absolute top-0.5 rounded-full bg-white transition-all duration-200 w-5 h-5 shadow-sm ${value ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

export function StatCard({ icon, value, label, color }: Readonly<{ icon: string; value: string; label: string; color: string }>) {
  return (
    <div className="rounded-xl p-3 text-center bg-card border border-border">
      <i className={`fas ${icon}`} style={{ color, fontSize: '1.1rem' }} />
      <p className="text-foreground font-extrabold mt-1 mb-0.5" style={{ fontSize: '1.25rem' }}>{value}</p>
      <p className="text-muted-foreground font-medium" style={{ fontSize: '0.65rem' }}>{label}</p>
    </div>
  );
}

const ROW_CLASS = "w-full flex items-center gap-3 px-4 py-3.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left bg-transparent border-none cursor-pointer";

export function AccountRow({ icon, label, accent, to, onClick }: Readonly<{ icon: string; label: string; accent?: boolean; to?: string; onClick?: () => void }>) {
  const inner = (
    <>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${accent ? 'bg-error/10' : 'bg-primary/10'}`}>
        <i className={`fas ${icon} ${accent ? 'text-error' : 'text-primary'}`} style={{ fontSize: '0.9rem' }} />
      </div>
      <span className={`font-medium flex-1 ${accent ? 'text-error' : 'text-foreground'}`} style={{ fontSize: '0.875rem' }}>{label}</span>
      <i className="fas fa-chevron-right text-muted-foreground/50" style={{ fontSize: '0.75rem' }} />
    </>
  );
  if (to) return <Link to={to} className={ROW_CLASS}>{inner}</Link>;
  return <button type="button" className={ROW_CLASS} onClick={onClick}>{inner}</button>;
}

export function AccountRowWithBadge({ icon, label, badge, to }: Readonly<{ icon: string; label: string; badge?: string; to?: string }>) {
  const inner = (
    <>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary/10">
        <i className={`fas ${icon} text-primary`} style={{ fontSize: '0.9rem' }} />
      </div>
      <span className="font-medium flex-1 text-foreground" style={{ fontSize: '0.875rem' }}>{label}</span>
      {badge && (
        <span className="px-2 py-0.5 rounded-full bg-primary text-white font-bold" style={{ fontSize: '0.7rem' }}>{badge}</span>
      )}
      <i className="fas fa-chevron-right text-muted-foreground/50" style={{ fontSize: '0.75rem' }} />
    </>
  );
  if (to) return <Link to={to} className={ROW_CLASS}>{inner}</Link>;
  return <button type="button" className={ROW_CLASS}>{inner}</button>;
}
