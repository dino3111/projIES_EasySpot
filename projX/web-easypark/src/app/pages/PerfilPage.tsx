import { useState } from 'react';
import { Link } from 'react-router';
import { useProfile } from '../context/ProfileContext';

export function PerfilPage() {
  const { profile } = useProfile();

  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      <div className="mb-5">
        <h1 className="text-foreground" style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.2 }}>Perfil</h1>
        <p className="text-muted-foreground mt-1" style={{ fontSize: '0.875rem' }}>
          A sua conta EasySpot
        </p>
      </div>

      <UserCard accountType={profile} />

      {profile === 'condutor' && <CondutorProfile />}
      {profile === 'gestor' && <GestorProfile />}
      {profile === 'tecnico' && <TecnicoProfile />}

      <div className="text-center pb-4 mt-2">
        <div className="flex items-center justify-center gap-2 mb-1">
          <i className="fas fa-square-parking text-primary text-base" aria-hidden="true" />
          <span className="text-foreground font-bold" style={{ fontSize: '0.875rem' }}>EasySpot</span>
        </div>
        <p className="text-muted-foreground" style={{ fontSize: '0.72rem' }}>Versão 1.0.0 · © 2026 EasySpot</p>
      </div>
    </div>
  );
}

function UserCard({ accountType }: Readonly<{ accountType: string }>) {
  const roleLabel: Record<string, string> = {
    condutor: 'Condutor',
    gestor: 'Gestor de Parques',
    tecnico: 'Técnico de Manutenção',
  };

  const roleIcon: Record<string, string> = {
    condutor: 'fa-car',
    gestor: 'fa-chart-pie',
    tecnico: 'fa-wrench',
  };

  return (
    <div className="flex items-center gap-4 rounded-2xl p-5 mb-5 bg-primary shadow-lg shadow-primary/20">
      <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 bg-white/20">
        <i className="fas fa-user text-white" style={{ fontSize: '1.75rem' }} />
      </div>
      <div>
        <p className="text-white font-bold" style={{ fontSize: '1.1rem' }}>Utilizador EasySpot</p>
        <p className="text-white/80 mt-0.5" style={{ fontSize: '0.8rem' }}>utilizador@easyspot.pt</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <i className={`fas ${roleIcon[accountType]} text-white/70`} style={{ fontSize: '0.7rem' }} />
          <span className="text-white/70 font-medium" style={{ fontSize: '0.72rem' }}>
            {roleLabel[accountType]}
          </span>
        </div>
      </div>
    </div>
  );
}

function CondutorProfile() {
  const { driverType, setDriverType } = useProfile();
  const [notifications, setNotifications] = useState(true);
  const [realtime, setRealtime] = useState(true);

  return (
    <>
      <SectionHeader icon="fa-id-card" title="Tipo de Condutor" />
      <div
        className="rounded-2xl p-4 mb-5 bg-card border border-border"
        role="radiogroup"
        aria-label="Selecionar tipo de condutor"
      >
        <p className="text-muted-foreground mb-3" style={{ fontSize: '0.78rem' }}>
          Selecione o seu perfil para personalizar os filtros e recomendacoes.
        </p>
        <div className="space-y-2.5">
          <UserTypeOption
            id="condutor"
            icon="fa-car"
            label="Condutor Regular"
            desc="Estacionamento convencional, precos e distancia"
            selected={driverType === 'regular' || driverType === null}
            onChange={() => setDriverType('regular')}
          />
          <UserTypeOption
            id="ev"
            icon="fa-charging-station"
            label="Condutor Veiculo Eletrico"
            desc="Prioridade a lugares com carregadores EV"
            selected={driverType === 'ev'}
            onChange={() => setDriverType('ev')}
          />
          <UserTypeOption
            id="acessivel"
            icon="fa-wheelchair"
            label="Mobilidade Reduzida"
            desc="Filtros para lugares acessiveis e monitorizados"
            selected={driverType === 'mobilidade_reduzida'}
            onChange={() => setDriverType('mobilidade_reduzida')}
          />
        </div>
      </div>

      <SectionHeader icon="fa-sliders" title="Preferencias" />
      <div className="rounded-2xl overflow-hidden mb-5 bg-card border border-border">
        <ToggleRow
          icon="fa-bell"
          label="Notificacoes"
          desc="Alertas de disponibilidade e reservas"
          value={notifications}
          onChange={setNotifications}
          id="notif-toggle"
        />
        <div className="h-px bg-border mx-4" />
        <ToggleRow
          icon="fa-rotate"
          label="Atualizacao Automatica"
          desc="Atualizar disponibilidade em tempo real"
          value={realtime}
          onChange={setRealtime}
          id="realtime-toggle"
        />
      </div>

      <SectionHeader icon="fa-chart-bar" title="As Minhas Estatisticas" />
      <div className="grid grid-cols-3 gap-3 mb-5">
        <Link to="/custos" className="contents">
          <StatCard icon="fa-receipt" value="€31.55" label="Gastos" color="var(--color-primary)" />
        </Link>
        <StatCard icon="fa-star" value="0" label="Favoritos" color="#f59e0b" />
        <StatCard icon="fa-route" value="0 km" label="Poupados" color="#22c55e" />
      </div>

      <SectionHeader icon="fa-gear" title="Conta" />
      <div className="rounded-2xl overflow-hidden mb-5 bg-card border border-border">
        <AccountRow icon="fa-bell" label="Gerir Notificacoes" />
        <div className="h-px bg-border mx-4" />
        <AccountRow icon="fa-shield-halved" label="Privacidade e Seguranca" />
        <div className="h-px bg-border mx-4" />
        <Link to="/reportar" className="contents"><AccountRow icon="fa-flag" label="Reportar Problema" accent /></Link>
      </div>
    </>
  );
}

function GestorProfile() {
  return (
    <>
      <SectionHeader icon="fa-chart-pie" title="Resumo Operacional" />
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard icon="fa-car" value="142" label="Veiculos hoje" color="var(--color-primary)" />
        <StatCard icon="fa-euro-sign" value="€984" label="Receita hoje" color="#22c55e" />
        <StatCard icon="fa-circle-exclamation" value="2" label="Alertas" color="#f59e0b" />
      </div>

      <SectionHeader icon="fa-building" title="Parques Geridos" />
      <div className="rounded-2xl overflow-hidden mb-5 bg-card border border-border">
        <AccountRow icon="fa-square-parking" label="Parque Central - Aveiro" />
        <div className="h-px bg-border mx-4" />
        <AccountRow icon="fa-square-parking" label="Parque Norte - Aveiro" />
      </div>

      <SectionHeader icon="fa-gear" title="Gestao" />
      <div className="rounded-2xl overflow-hidden mb-5 bg-card border border-border">
        <Link to="/gestor/dashboard" className="contents"><AccountRow icon="fa-chart-line" label="Dashboard de Operacoes" /></Link>
        <div className="h-px bg-border mx-4" />
        <Link to="/gestor/tarifas-ocorrencias" className="contents"><AccountRow icon="fa-tags" label="Tarifas e Ocorrencias" /></Link>
        <div className="h-px bg-border mx-4" />
        <AccountRow icon="fa-file-export" label="Exportar Relatorios" />
        <div className="h-px bg-border mx-4" />
        <AccountRow icon="fa-shield-halved" label="Privacidade e Seguranca" />
        <div className="h-px bg-border mx-4" />
        <Link to="/reportar" className="contents"><AccountRow icon="fa-flag" label="Reportar Problema" accent /></Link>
      </div>
    </>
  );
}

function TecnicoProfile() {
  return (
    <>
      <SectionHeader icon="fa-wrench" title="Estado dos Sensores" />
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard icon="fa-circle-check" value="187" label="Operacionais" color="#22c55e" />
        <StatCard icon="fa-triangle-exclamation" value="5" label="Em alerta" color="#f59e0b" />
        <StatCard icon="fa-circle-xmark" value="2" label="Falha" color="#ef4444" />
      </div>

      <SectionHeader icon="fa-building" title="Parque Atribuido" />
      <div className="rounded-2xl overflow-hidden mb-5 bg-card border border-border">
        <AccountRow icon="fa-square-parking" label="Parque Central - Aveiro" />
      </div>

      <SectionHeader icon="fa-list-check" title="Manutencao" />
      <div className="rounded-2xl overflow-hidden mb-5 bg-card border border-border">
        <AccountRow icon="fa-screwdriver-wrench" label="Ordens de Manutencao Abertas" />
        <div className="h-px bg-border mx-4" />
        <AccountRow icon="fa-microchip" label="Diagnostico de Sensores" />
        <div className="h-px bg-border mx-4" />
        <AccountRow icon="fa-file-lines" label="Historico de Intervencoes" />
        <div className="h-px bg-border mx-4" />
        <AccountRow icon="fa-shield-halved" label="Privacidade e Seguranca" />
        <div className="h-px bg-border mx-4" />
        <Link to="/reportar" className="contents"><AccountRow icon="fa-flag" label="Reportar Problema" accent /></Link>
      </div>
    </>
  );
}

function SectionHeader({ icon, title }: Readonly<{ icon: string; title: string }>) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <i className={`fas ${icon} text-primary`} style={{ fontSize: '0.9rem' }} />
      <h2 className="text-foreground font-bold" style={{ fontSize: '0.95rem' }}>{title}</h2>
    </div>
  );
}

function UserTypeOption({ id, icon, label, desc, selected, onChange }: Readonly<{
  id: string;
  icon: string;
  label: string;
  desc: string;
  selected: boolean;
  onChange: () => void;
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

function ToggleRow({ icon, label, desc, value, onChange, id }: Readonly<{
  icon: string;
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
  id: string;
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
        aria-checked={value ? 'true' : 'false'}
        aria-label={label}
        onClick={() => onChange(!value)}
        className={`flex-shrink-0 rounded-full transition-all duration-200 relative w-11 h-6 cursor-pointer ${value ? 'bg-primary' : 'bg-muted'}`}
      >
        <span className={`absolute top-0.5 rounded-full bg-white transition-all duration-200 w-5 h-5 shadow-sm ${value ? 'left-5.5' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

function StatCard({ icon, value, label, color }: Readonly<{ icon: string; value: string; label: string; color: string }>) {
  return (
    <div className="rounded-xl p-3 text-center bg-card border border-border">
      <i className={`fas ${icon}`} style={{ color, fontSize: '1.1rem' }} />
      <p className="text-foreground font-extrabold mt-1 mb-0.5" style={{ fontSize: '1.25rem' }}>{value}</p>
      <p className="text-muted-foreground font-medium" style={{ fontSize: '0.65rem' }}>{label}</p>
    </div>
  );
}

function AccountRow({ icon, label, accent }: Readonly<{ icon: string; label: string; accent?: boolean }>) {
  return (
    <button
      type="button"
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left bg-transparent border-none cursor-pointer"
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${accent ? 'bg-error/10' : 'bg-primary/10'}`}>
        <i className={`fas ${icon} ${accent ? 'text-error' : 'text-primary'}`} style={{ fontSize: '0.9rem' }} />
      </div>
      <span className={`font-medium flex-1 ${accent ? 'text-error' : 'text-foreground'}`} style={{ fontSize: '0.875rem' }}>{label}</span>
      <i className="fas fa-chevron-right text-muted-foreground/50" style={{ fontSize: '0.75rem' }} />
    </button>
  );
}

function AccountRowWithBadge({ icon, label, badge }: Readonly<{ icon: string; label: string; badge?: string }>) {
  return (
    <button type="button" className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left bg-transparent border-none cursor-pointer">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary/10">
        <i className={`fas ${icon} text-primary`} style={{ fontSize: '0.9rem' }} />
      </div>
      <span className="font-medium flex-1 text-foreground" style={{ fontSize: '0.875rem' }}>{label}</span>
      {badge && (
        <span className="px-2 py-0.5 rounded-full bg-primary text-white font-bold" style={{ fontSize: '0.7rem' }}>
          {badge}
        </span>
      )}
      <i className="fas fa-chevron-right text-muted-foreground/50" style={{ fontSize: '0.75rem' }} />
    </button>
  );
}