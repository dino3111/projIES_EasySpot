import { useState } from 'react';
import { Link } from 'react-router';
import { useProfile } from '../../../context/ProfileContext';
import { SectionHeader, UserTypeOption, ToggleRow, StatCard, AccountRow, AccountRowWithBadge } from './ProfilePrimitives';

export function DriverProfile() {
  const { driverType, setDriverType, vehicles } = useProfile();
  const [notifications, setNotifications] = useState(true);
  const [realtime, setRealtime] = useState(true);

  return (
    <>
      <SectionHeader icon="fa-car" title="Os Meus Veículos" />
      <div className="rounded-2xl overflow-hidden mb-5 bg-card border border-border">
        <AccountRowWithBadge to="/vehicles" icon="fa-car-side" label="Gerir Veículos" badge={vehicles.length > 0 ? String(vehicles.length) : undefined} />
      </div>

      <SectionHeader icon="fa-id-card" title="Tipo de Condutor" />
      <div className="rounded-2xl p-4 mb-5 bg-card border border-border" role="radiogroup" aria-label="Selecionar tipo de condutor">
        <p className="text-muted-foreground mb-3" style={{ fontSize: '0.78rem' }}>
          Selecione o seu perfil para personalizar os filtros e recomendações.
        </p>
        <div className="space-y-2.5">
          <UserTypeOption id="condutor"  icon="fa-car"              label="Condutor Regular"          desc="Estacionamento convencional, precos e distancia"      selected={driverType === 'regular' || driverType === null} onChange={() => setDriverType('regular')} />
          <UserTypeOption id="ev"        icon="fa-charging-station" label="Condutor Veiculo Eletrico"  desc="Prioridade a lugares com carregadores EV"             selected={driverType === 'ev'}                             onChange={() => setDriverType('ev')} />
          <UserTypeOption id="acessivel" icon="fa-wheelchair"       label="Mobilidade Reduzida"        desc="Filtros para lugares acessiveis e monitorizados"      selected={driverType === 'reduced_mobility'}               onChange={() => setDriverType('reduced_mobility')} />
        </div>
      </div>

      <SectionHeader icon="fa-sliders" title="Preferencias" />
      <div className="rounded-2xl overflow-hidden mb-5 bg-card border border-border">
        <ToggleRow icon="fa-bell"   label="Notificacoes"          desc="Alertas de disponibilidade e reservas"        value={notifications} onChange={setNotifications} id="notif-toggle" />
        <div className="h-px bg-border mx-4" />
        <ToggleRow icon="fa-rotate" label="Atualizacao Automatica" desc="Atualizar disponibilidade em tempo real"       value={realtime}      onChange={setRealtime}      id="realtime-toggle" />
      </div>

      <SectionHeader icon="fa-chart-bar" title="As Minhas Estatisticas" />
      <div className="grid grid-cols-3 gap-3 mb-5">
        <Link to="/costs" className="contents">
          <StatCard icon="fa-receipt" value="€31.55" label="Gastos"    color="var(--color-primary)" />
        </Link>
        <StatCard icon="fa-star"  value="0"    label="Favoritos" color="#f59e0b" />
        <StatCard icon="fa-route" value="0 km" label="Poupados"  color="#22c55e" />
      </div>

      <SectionHeader icon="fa-gear" title="Conta" />
      <div className="rounded-2xl overflow-hidden mb-5 bg-card border border-border">
        <AccountRow icon="fa-bell"          label="Gerir Notificacoes" />
        <div className="h-px bg-border mx-4" />
        <AccountRow icon="fa-shield-halved" label="Privacidade e Seguranca" />
        <div className="h-px bg-border mx-4" />
        <AccountRow to="/report" icon="fa-flag" label="Reportar Problema" accent />
      </div>
    </>
  );
}

export function ManagerProfile() {
  return (
    <>
      <SectionHeader icon="fa-chart-pie" title="Resumo Operacional" />
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard icon="fa-car"                value="142"  label="Veiculos hoje" color="var(--color-primary)" />
        <StatCard icon="fa-euro-sign"          value="€984" label="Receita hoje"  color="#22c55e" />
        <StatCard icon="fa-circle-exclamation" value="2"    label="Alertas"       color="#f59e0b" />
      </div>

      <SectionHeader icon="fa-building" title="Parques Geridos" />
      <div className="rounded-2xl overflow-hidden mb-5 bg-card border border-border">
        <AccountRow icon="fa-square-parking" label="Parque Central - Aveiro" />
        <div className="h-px bg-border mx-4" />
        <AccountRow icon="fa-square-parking" label="Parque Norte - Aveiro" />
      </div>

      <SectionHeader icon="fa-gear" title="Gestao" />
      <div className="rounded-2xl overflow-hidden mb-5 bg-card border border-border">
        <AccountRow to="/manager/dashboard"         icon="fa-chart-line"    label="Dashboard de Operacoes" />
        <div className="h-px bg-border mx-4" />
        <AccountRow to="/manager/tariffs-incidents" icon="fa-tags"          label="Tarifas e Ocorrencias" />
        <div className="h-px bg-border mx-4" />
        <AccountRow                                 icon="fa-file-export"   label="Exportar Relatorios" />
        <div className="h-px bg-border mx-4" />
        <AccountRow                                 icon="fa-shield-halved" label="Privacidade e Seguranca" />
        <div className="h-px bg-border mx-4" />
        <AccountRow to="/report" icon="fa-flag" label="Reportar Problema" accent />
      </div>
    </>
  );
}

export function TechnicianProfile() {
  return (
    <>
      <SectionHeader icon="fa-wrench" title="Estado dos Sensores" />
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard icon="fa-circle-check"         value="187" label="Operacionais" color="#22c55e" />
        <StatCard icon="fa-triangle-exclamation" value="5"   label="Em alerta"    color="#f59e0b" />
        <StatCard icon="fa-circle-xmark"         value="2"   label="Falha"        color="#ef4444" />
      </div>

      <SectionHeader icon="fa-building" title="Parque Atribuido" />
      <div className="rounded-2xl overflow-hidden mb-5 bg-card border border-border">
        <AccountRow icon="fa-square-parking" label="Parque Central - Aveiro" />
      </div>

      <SectionHeader icon="fa-list-check" title="Manutencao" />
      <div className="rounded-2xl overflow-hidden mb-5 bg-card border border-border">
        <AccountRow icon="fa-screwdriver-wrench" label="Ordens de Manutencao Abertas" />
        <div className="h-px bg-border mx-4" />
        <AccountRow icon="fa-microchip"          label="Diagnostico de Sensores" />
        <div className="h-px bg-border mx-4" />
        <AccountRow icon="fa-file-lines"         label="Historico de Intervencoes" />
        <div className="h-px bg-border mx-4" />
        <AccountRow icon="fa-shield-halved"      label="Privacidade e Seguranca" />
        <div className="h-px bg-border mx-4" />
        <AccountRow to="/report" icon="fa-flag" label="Reportar Problema" accent />
      </div>
    </>
  );
}
