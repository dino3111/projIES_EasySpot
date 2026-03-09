import { useState } from 'react';
import { Link } from 'react-router';

type UserType = 'condutor' | 'ev' | 'acessivel';

export function PerfilPage() {
  const [userType, setUserType] = useState<UserType>('condutor');
  const [notifications, setNotifications] = useState(true);
  const [realtime, setRealtime] = useState(true);

  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      <div className="mb-5">
        <h1
          className="text-foreground"
          style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.2 }}
        >
          Perfil
        </h1>
        <p className="text-muted-foreground mt-1" style={{ fontSize: '0.875rem' }}>
          Personalize a sua experiência EasySpot
        </p>
      </div>

      {/* Avatar e info do utilizador */}
      <div
        className="flex items-center gap-4 rounded-2xl p-5 mb-5 bg-primary shadow-lg shadow-primary/20"
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 bg-white/20"
          aria-hidden="true"
        >
          <i className="fas fa-user text-white" style={{ fontSize: '1.75rem' }}></i>
        </div>
        <div>
          <p className="text-white font-bold" style={{ fontSize: '1.1rem' }}>Utilizador EasySpot</p>
          <p className="text-white/80 mt-0.5" style={{ fontSize: '0.8rem' }}>
            utilizador@easyspot.pt
          </p>
        </div>
      </div>

      {/* Tipo de utilizador */}
      <SectionHeader icon="fa-id-card" title="Tipo de Condutor" />
      <div
        className="rounded-2xl p-4 mb-5 bg-card border border-border"
        role="radiogroup"
        aria-label="Selecionar tipo de condutor"
      >
        <p className="text-muted-foreground mb-3" style={{ fontSize: '0.78rem' }}>
          Selecione o seu perfil para personalizar os filtros e recomendações.
        </p>
        <div className="space-y-2.5">
          <UserTypeOption
            id="condutor"
            icon="fa-car"
            label="Condutor Regular"
            desc="Estacionamento convencional, preços e distância"
            selected={userType === 'condutor'}
            onChange={() => setUserType('condutor')}
          />
          <UserTypeOption
            id="ev"
            icon="fa-charging-station"
            label="Condutor Veículo Elétrico"
            desc="Prioridade a lugares com carregadores EV"
            selected={userType === 'ev'}
            onChange={() => setUserType('ev')}
          />
          <UserTypeOption
            id="acessivel"
            icon="fa-wheelchair"
            label="Mobilidade Reduzida"
            desc="Filtros para lugares acessíveis e monitorizados"
            selected={userType === 'acessivel'}
            onChange={() => setUserType('acessivel')}
          />
        </div>
      </div>

      {/* Preferências */}
      <SectionHeader icon="fa-sliders" title="Preferências" />
      <div
        className="rounded-2xl overflow-hidden mb-5 bg-card border border-border"
      >
        <ToggleRow
          icon="fa-bell"
          label="Notificações"
          desc="Alertas de disponibilidade e reservas"
          value={notifications}
          onChange={setNotifications}
          id="notif-toggle"
        />
        <div className="h-px bg-border mx-4" />
        <ToggleRow
          icon="fa-rotate"
          label="Actualização Automática"
          desc="Actualizar disponibilidade em tempo real"
          value={realtime}
          onChange={setRealtime}
          id="realtime-toggle"
        />
      </div>

      {/* Estatísticas do utilizador */}
      <SectionHeader icon="fa-chart-bar" title="As Minhas Estatísticas" />
      <div className="grid grid-cols-3 gap-3 mb-5">
        <Link to="/gastos" className="contents">
          <StatCard icon="fa-receipt" value="€31.55" label="Gastos" color="var(--color-primary)" />
        </Link>
        <StatCard icon="fa-star" value="0" label="Favoritos" color="#f59e0b" />
        <StatCard icon="fa-route" value="0 km" label="Poupados" color="#22c55e" />
      </div>

      {/* Ações da conta */}
      <SectionHeader icon="fa-gear" title="Conta" />
      <div
        className="rounded-2xl overflow-hidden mb-5 bg-card border border-border"
      >
        <Link to="/gastos" className="contents">
          <AccountRow icon="fa-receipt" label="Histórico de Gastos" />
        </Link>
        <div className="h-px bg-border mx-4" />
        <AccountRow icon="fa-bell" label="Gerir Notificações" />
        <div className="h-px bg-border mx-4" />
        <AccountRow icon="fa-shield-halved" label="Privacidade e Segurança" />
        <div className="h-px bg-border mx-4" />
        <AccountRow icon="fa-circle-question" label="Ajuda e Suporte" />
        <div className="h-px bg-border mx-4" />
        <AccountRow icon="fa-file-lines" label="Termos e Condições" />
      </div>

      {/* Versão */}
      <div className="text-center pb-4">
        <div className="flex items-center justify-center gap-2 mb-1">
          <i className="fas fa-square-parking text-primary text-base" aria-hidden="true"></i>
          <span className="text-foreground font-bold" style={{ fontSize: '0.875rem' }}>EasySpot</span>
        </div>
        <p className="text-muted-foreground" style={{ fontSize: '0.72rem' }}>Versão 1.0.0 · © 2026 EasySpot</p>
      </div>
    </div>
  );
}

/* ---- Subcomponentes ---- */

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <i className={`fas ${icon} text-primary`} style={{ fontSize: '0.9rem' }} aria-hidden="true"></i>
      <h2 className="text-foreground font-bold" style={{ fontSize: '0.95rem' }}>{title}</h2>
    </div>
  );
}

interface UserTypeOptionProps {
  id: string;
  icon: string;
  label: string;
  desc: string;
  selected: boolean;
  onChange: () => void;
}

function UserTypeOption({ id, icon, label, desc, selected, onChange }: UserTypeOptionProps) {
  return (
    <label
      htmlFor={id}
      className={`flex items-center gap-3 rounded-xl p-3 cursor-pointer transition-all border ${
        selected ? 'bg-primary/10 border-primary' : 'bg-background border-border hover:bg-black/5 dark:hover:bg-white/5'
      }`}
    >
      <input
        type="radio"
        id={id}
        name="userType"
        className="sr-only"
        checked={selected}
        onChange={onChange}
        aria-label={`Tipo de condutor: ${label}`}
      />
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
          selected ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
        }`}
        aria-hidden="true"
      >
        <i
          className={`fas ${icon}`}
          style={{ fontSize: '0.9rem' }}
        ></i>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-foreground font-bold" style={{ fontSize: '0.875rem' }}>{label}</p>
        <p className="text-muted-foreground" style={{ fontSize: '0.72rem', lineHeight: 1.4 }}>{desc}</p>
      </div>
      <div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
          selected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
        }`}
        aria-hidden="true"
      >
        {selected && (
          <div className="w-2 h-2 rounded-full bg-white" />
        )}
      </div>
    </label>
  );
}

function ToggleRow({
  icon, label, desc, value, onChange, id,
}: {
  icon: string;
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
  id: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary/10"
        aria-hidden="true"
      >
        <i className={`fas ${icon} text-primary`} style={{ fontSize: '0.9rem' }}></i>
      </div>
      <div className="flex-1 min-w-0">
        <label
          htmlFor={id}
          className="text-foreground font-semibold cursor-pointer block"
          style={{ fontSize: '0.875rem' }}
        >
          {label}
        </label>
        <p className="text-muted-foreground" style={{ fontSize: '0.72rem', lineHeight: 1.4 }}>{desc}</p>
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={value}
        aria-label={label}
        onClick={() => onChange(!value)}
        className={`flex-shrink-0 rounded-full transition-all duration-200 relative w-11 h-6 cursor-pointer ${
          value ? 'bg-primary' : 'bg-muted'
        }`}
      >
        <span
          className={`absolute top-0.5 rounded-full bg-white transition-all duration-200 w-5 h-5 shadow-sm ${
            value ? 'left-5.5' : 'left-0.5'
          }`}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}

function StatCard({ icon, value, label, color }: { icon: string; value: string; label: string; color: string }) {
  return (
    <div
      className="rounded-xl p-3 text-center bg-card border border-border"
    >
      <i className={`fas ${icon}`} style={{ color, fontSize: '1.1rem' }} aria-hidden="true"></i>
      <p className="text-foreground font-extrabold mt-1 mb-0.5" style={{ fontSize: '1.25rem' }}>{value}</p>
      <p className="text-muted-foreground font-medium" style={{ fontSize: '0.65rem' }}>{label}</p>
    </div>
  );
}

function AccountRow({ icon, label }: { icon: string; label: string }) {
  return (
    <button
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left bg-transparent border-none cursor-pointer"
      aria-label={label}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary/10"
        aria-hidden="true"
      >
        <i className={`fas ${icon} text-primary`} style={{ fontSize: '0.9rem' }}></i>
      </div>
      <span className="text-foreground font-medium flex-1" style={{ fontSize: '0.875rem' }}>{label}</span>
      <i className="fas fa-chevron-right text-muted-foreground/50" style={{ fontSize: '0.75rem' }} aria-hidden="true"></i>
    </button>
  );
}
