import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  mockSensors,
  mockUptimeTrend,
  mockMaintenanceOrders,
  computeTechKPIs,
  type SensorDevice,
  type SensorStatus,
} from '../../data/technicianData';
import { KpiCard } from './components/shared';
import { StatusUpdateModal } from './components/SensorModals';
import { STATUS_COLOR, STATUS_LABEL } from './components/maintenanceTypes';

export function DashboardTechnicianPage() {
  const [sensors, setSensors] = useState<SensorDevice[]>(mockSensors);
  const [updateModal, setUpdateModal] = useState<SensorDevice | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const kpis = computeTechKPIs(sensors);

  const handleStatusUpdate = (sensorId: string, newStatus: SensorStatus, notes: string) => {
    setSensors((prev) => prev.map((s) => {
      if (s.id !== sensorId) return s;
      const newLog = {
        id: `upd-${Date.now()}`,
        timestamp: new Date().toISOString(),
        codigo: 'INFO_STATUS_UPDATED',
        descricao: `Estado atualizado para "${STATUS_LABEL[newStatus]}" pelo técnico.${notes ? ` Notas: ${notes}` : ''}`,
        resolvido: true,
      };
      return { ...s, status: newStatus, historicoErros: [newLog, ...s.historicoErros] };
    }));
    setUpdateModal(null);
    setToast(`Sensor atualizado para "${STATUS_LABEL[newStatus]}" com sucesso.`);
    setTimeout(() => setToast(null), 4000);
  };

  const pieData = [
    { name: 'Operacional', value: kpis.operacionais, color: STATUS_COLOR.operacional },
    { name: 'Falha',       value: kpis.emFalha,      color: STATUS_COLOR.falha },
    { name: 'Offline',     value: kpis.offline,       color: STATUS_COLOR.offline },
    { name: 'Manutenção',  value: kpis.emManutencao,  color: STATUS_COLOR.manutencao },
  ].filter((d) => d.value > 0);

  const urgentOrders = mockMaintenanceOrders.filter(
    (o) => o.estado !== 'concluida' && (o.prioridade === 'critica' || o.prioridade === 'alta')
  );

  return (
    <div className="px-4 py-5 max-w-screen-xl mx-auto space-y-6">
      {toast && <Toast message={toast} />}

      <PageHeader />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon="fa-microchip"          label="Total Sensores" value={kpis.totalSensores.toString()} subValue={`${kpis.operacionais} operacionais`}                       trend="neutral"                                           color="#7357ec" />
        <KpiCard icon="fa-signal"             label="Uptime Médio"   value={`${kpis.uptimeMedio}%`}        subValue={`${kpis.emFalha + kpis.offline} com problemas`}           trend={kpis.uptimeMedio >= 97 ? 'up' : 'warn'}            color="#22c55e" />
        <KpiCard icon="fa-circle-exclamation" label="Falhas Ativas"  value={(kpis.emFalha + kpis.offline).toString()} subValue={`${kpis.emFalha} falha · ${kpis.offline} offline`} trend={kpis.emFalha + kpis.offline > 0 ? 'down' : 'neutral'} color="#d4183d" />
        <KpiCard icon="fa-clock-rotate-left"  label="MTTR"           value={`${kpis.mttrHoras}h`}          subValue={`Tx. F.Pos: ${kpis.taxaFalsosPositivos}%`}               trend={kpis.mttrHoras < 6 ? 'up' : 'warn'}               color="#f59e0b" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <UptimeChart />
        <StatusDonut pieData={pieData} total={kpis.totalSensores} />
      </div>

      {urgentOrders.length > 0 && (
        <UrgentOrders orders={urgentOrders} sensors={sensors} onUpdate={setUpdateModal} />
      )}

      {updateModal && (
        <StatusUpdateModal
          sensor={updateModal}
          onClose={() => setUpdateModal(null)}
          onConfirm={handleStatusUpdate}
        />
      )}
    </div>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-green-600 text-white shadow-xl"
      style={{ fontSize: '0.85rem', fontWeight: 600 }}
    >
      <i className="fas fa-circle-check" aria-hidden="true" />
      {message}
    </div>
  );
}

function PageHeader() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 className="text-foreground" style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.2 }}>Painel Técnico</h1>
        <p className="text-muted-foreground mt-1" style={{ fontSize: '0.875rem' }}>Segunda-feira, 9 de março de 2026 · Laura Farias</p>
      </div>
      <button
        className="self-start sm:self-auto flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border hover:bg-muted transition-colors text-foreground"
        style={{ fontSize: '0.8rem', fontWeight: 600 }}
        aria-label="Exportar relatório técnico"
      >
        <i className="fas fa-file-export text-primary" style={{ fontSize: '0.85rem' }} aria-hidden="true" />
        Exportar
      </button>
    </div>
  );
}

function UptimeChart() {
  return (
    <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-4">
      <h2 className="text-foreground mb-4" style={{ fontSize: '1rem', fontWeight: 700 }}>Uptime Global — Últimos 7 Dias</h2>
      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={mockUptimeTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="gradUptime" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="day" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis domain={[90, 100]} tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '12px', color: 'var(--color-foreground)', fontSize: '0.8rem' }}
              formatter={(v: number) => [`${v}%`, 'Uptime']}
            />
            <Area type="monotone" dataKey="uptime" stroke="#22c55e" strokeWidth={2.5} fill="url(#gradUptime)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StatusDonut({ pieData, total }: { pieData: { name: string; value: number; color: string }[]; total: number }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <h2 className="text-foreground mb-4" style={{ fontSize: '1rem', fontWeight: 700 }}>Estado dos Sensores</h2>
      <div style={{ height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={42} outerRadius={62} paddingAngle={3}>
              {pieData.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Pie>
            <Tooltip
              contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '10px', fontSize: '0.78rem', color: 'var(--color-foreground)' }}
              formatter={(v: number, name: string) => [v, name]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-1.5 mt-1">
        {pieData.map((d) => (
          <div key={d.name} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} aria-hidden="true" />
            <span className="text-foreground flex-1" style={{ fontSize: '0.72rem' }}>{d.name}</span>
            <span className="text-muted-foreground" style={{ fontSize: '0.72rem' }}>{d.value}</span>
            <span className="px-1.5 py-0.5 rounded-full" style={{ fontSize: '0.65rem', fontWeight: 700, background: `${d.color}22`, color: d.color }}>
              {Math.round((d.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface UrgentOrdersProps {
  orders: typeof mockMaintenanceOrders;
  sensors: SensorDevice[];
  onUpdate: (sensor: SensorDevice) => void;
}

function UrgentOrders({ orders, sensors, onUpdate }: UrgentOrdersProps) {
  return (
    <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <i className="fas fa-triangle-exclamation text-destructive" style={{ fontSize: '1rem' }} aria-hidden="true" />
        <h2 className="text-foreground" style={{ fontSize: '1rem', fontWeight: 700 }}>Ordens Urgentes</h2>
        <span className="ml-auto px-2 py-0.5 rounded-full bg-destructive/15 text-destructive" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
          {orders.length} pendentes
        </span>
      </div>
      <div className="space-y-2">
        {orders.map((order) => {
          const priColor = order.prioridade === 'critica' ? '#d4183d' : '#f59e0b';
          const sensor = sensors.find((s) => s.id === order.sensorId);
          return (
            <div key={order.id} className="bg-card border border-border rounded-xl p-3 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${priColor}15` }} aria-hidden="true">
                <i className="fas fa-wrench" style={{ color: priColor, fontSize: '0.8rem' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-foreground" style={{ fontSize: '0.85rem', fontWeight: 700 }}>{order.titulo}</span>
                  <span className="px-1.5 py-0.5 rounded-full" style={{ fontSize: '0.62rem', fontWeight: 700, background: `${priColor}20`, color: priColor }}>
                    {order.prioridade === 'critica' ? 'Crítica' : 'Alta'}
                  </span>
                </div>
                <p className="text-muted-foreground mt-0.5" style={{ fontSize: '0.75rem' }}>
                  {order.parque} · <span style={{ fontFamily: 'monospace' }}>{order.sensorId}</span>
                  {order.prazo && ` · Prazo: ${new Date(order.prazo).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`}
                </p>
              </div>
              {sensor && (
                <button
                  onClick={() => onUpdate(sensor)}
                  className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                  style={{ fontSize: '0.72rem', fontWeight: 600 }}
                  aria-label={`Atualizar estado do sensor ${sensor.id}`}
                >
                  Atualizar
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
