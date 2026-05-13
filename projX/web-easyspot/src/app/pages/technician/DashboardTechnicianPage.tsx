import { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  fetchTechnicianDashboard,
  type TechnicianDashboard,
  type WorkOrder,
} from '../../services/technicianApi';
import { KpiCard } from './components/shared';

const STATUS_COLOR: Record<string, string> = {
  operational: '#22c55e',
  degraded:    '#f59e0b',
  offline:     '#ef4444',
};


export function DashboardTechnicianPage() {
  const [dashboard, setDashboard] = useState<TechnicianDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchTechnicianDashboard()
      .then((data) => {
        console.info('[TECH-FE] dashboard page data', {
          totalSensors: data.kpis.totalSensors,
          operationalSensors: data.kpis.operationalSensors,
          urgentWorkOrders: data.urgentWorkOrders.length,
        });
        if (!cancelled) { setDashboard(data); setLoading(false); }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar dados.');
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);




  if (loading) return <PageLoading />;
  if (error)   return <PageError message={error} onRetry={() => { setLoading(true); setError(null); fetchTechnicianDashboard().then(setDashboard).catch((e: unknown) => setError(e instanceof Error ? e.message : 'Erro')).finally(() => setLoading(false)); }} />;
  if (!dashboard) return null;

  const { kpis, uptimeLast7Days, sensorDistribution, urgentWorkOrders } = dashboard;

  const pieData = sensorDistribution.map((d) => ({
    name: d.label,
    value: d.count,
    color: STATUS_COLOR[d.status] ?? '#94a3b8',
  })).filter((d) => d.value > 0);

  const uptimeChartData = uptimeLast7Days.map((d) => ({ day: d.day, uptime: d.uptimePct }));

  const pendingOrders = urgentWorkOrders.filter((o) => o.state !== 'resolved');

  return (
    <div className="px-4 py-5 max-w-screen-xl mx-auto space-y-6">

      <PageHeader />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon="fa-microchip"          label="Total Sensores" value={kpis.totalSensors.toString()}         subValue={`${kpis.operationalSensors} operacionais`}                    trend="neutral"                                                      color="#7357ec" />
        <KpiCard icon="fa-signal"             label="Uptime Médio"   value={`${kpis.uptimePct}%`}                 subValue={`Variação: ${kpis.failuresTodayVariancePct > 0 ? '+' : ''}${kpis.failuresTodayVariancePct}%`} trend={kpis.uptimePct >= 97 ? 'up' : 'warn'} color="#22c55e" />
        <KpiCard icon="fa-circle-exclamation" label="Falhas Hoje"    value={kpis.failuresToday.toString()}         subValue={`vs ontem: ${kpis.failuresTodayVariancePct > 0 ? '+' : ''}${kpis.failuresTodayVariancePct}%`} trend={kpis.failuresToday > 0 ? 'down' : 'neutral'} color="#d4183d" />
        <KpiCard icon="fa-clock-rotate-left"  label="MTTR"           value={kpis.meanTimeToRepair}                subValue={`Variação: ${kpis.mttrVariancePct > 0 ? '+' : ''}${kpis.mttrVariancePct}%`}                trend={kpis.mttrVariancePct <= 0 ? 'up' : 'warn'}   color="#f59e0b" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <UptimeChart data={uptimeChartData} />
        <StatusDonut pieData={pieData} total={kpis.totalSensors} />
      </div>

      {pendingOrders.length > 0 && (
        <UrgentOrders orders={pendingOrders} />
      )}
    </div>
  );
}


function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground gap-3">
      <i className="fas fa-spinner fa-spin" aria-hidden="true" />
      <span>A carregar painel técnico…</span>
    </div>
  );
}

function PageError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
      <div className="flex items-center gap-2 text-destructive">
        <i className="fas fa-triangle-exclamation" aria-hidden="true" />
        <span style={{ fontWeight: 600 }}>{message}</span>
      </div>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        style={{ fontSize: '0.85rem', fontWeight: 600 }}
      >
        Tentar novamente
      </button>
    </div>
  );
}

function PageHeader() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 className="text-foreground" style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.2 }}>Painel Técnico</h1>
        <p className="text-muted-foreground mt-1" style={{ fontSize: '0.875rem' }}>Diagnóstico remoto de sensores e ocorrências urgentes</p>
      </div>
    </div>
  );
}

function UptimeChart({ data }: { data: { day: string; uptime: number }[] }) {
  return (
    <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-4">
      <h2 className="text-foreground mb-4" style={{ fontSize: '1rem', fontWeight: 700 }}>Uptime Global — Últimos 7 Dias</h2>
      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="gradUptime" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="day" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis domain={[85, 100]} tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
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
              {total > 0 ? Math.round((d.value / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function UrgentOrders({ orders, onAction }: { orders: WorkOrder[]; onAction: (o: WorkOrder) => void }) {
  return (
    <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <i className="fas fa-triangle-exclamation text-destructive" style={{ fontSize: '1rem' }} aria-hidden="true" />
        <h2 className="text-foreground" style={{ fontSize: '1rem', fontWeight: 700 }}>Ocorrências Urgentes</h2>
        <span className="ml-auto px-2 py-0.5 rounded-full bg-destructive/15 text-destructive" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
          {orders.length} pendentes
        </span>
      </div>
      <div className="space-y-2">
        {orders.map((order) => {
          const priColor = order.severity === 'critical' ? '#d4183d' : '#f59e0b';
          return (
            <div key={order.id} className="bg-card border border-border rounded-xl p-3 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${priColor}15` }} aria-hidden="true">
                <i className="fas fa-wrench" style={{ color: priColor, fontSize: '0.8rem' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-foreground" style={{ fontSize: '0.85rem', fontWeight: 700 }}>{order.description}</span>
                  <span className="px-1.5 py-0.5 rounded-full" style={{ fontSize: '0.62rem', fontWeight: 700, background: `${priColor}20`, color: priColor }}>
                    {order.severity === 'critical' ? 'Crítica' : 'Alta'}
                  </span>
                </div>
                <p className="text-muted-foreground mt-0.5" style={{ fontSize: '0.75rem' }}>
                  {order.park} · <span style={{ fontFamily: 'monospace' }}>{order.sensorId ?? 'N/A'}</span>
                  {order.zone ? ` · ${order.zone}` : ''}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
