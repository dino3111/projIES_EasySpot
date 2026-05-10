import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell,
} from 'recharts';
import { KpiCard, AlertRow, OccBar } from './components/shared';
import type { IssueReport } from '../../data/gestorData';
import {
  fetchManagerDashboard,
  type ManagerDashboardResponse,
  type DashboardAlertSummary,
  type DashboardZoneOccupancy,
  type DashboardParkSummary,
  type DashboardDailyMetric,
  type DashboardHourlyOccupancy,
} from '../../services/managerApi';

type ChartTab = 'entradas' | 'receita';

const ZONE_COLORS: Record<string, string> = {
  standard: '#7357ec',
  ev: '#22c55e',
  accessible: '#3b82f6',
  reserved: '#f59e0b',
};

function zoneColor(type: string) {
  return ZONE_COLORS[type.toLowerCase()] ?? '#7357ec';
}

function mapAlertToIssue(a: DashboardAlertSummary): IssueReport {
  const typeMap: Record<string, IssueReport['tipo']> = {
    sensor: 'sensor', client: 'cliente', system: 'sistema',
    cliente: 'cliente', sistema: 'sistema',
  };
  const sevMap: Record<string, IssueReport['severidade']> = {
    critical: 'critica', critica: 'critica',
    warning: 'aviso', aviso: 'aviso',
    info: 'info',
  };
  const stateMap: Record<string, IssueReport['estado']> = {
    open: 'aberto', aberto: 'aberto',
    in_progress: 'em-progresso', 'em-progresso': 'em-progresso',
    resolved: 'resolvido', resolvido: 'resolvido',
  };
  return {
    id: a.id,
    tipo: typeMap[a.type?.toLowerCase()] ?? 'sistema',
    parque: a.park ?? '',
    zona: a.zone ?? undefined,
    sensorId: a.sensorId ?? undefined,
    matricula: a.plate ?? undefined,
    descricao: a.description ?? '',
    severidade: sevMap[a.severity?.toLowerCase()] ?? 'info',
    estado: stateMap[a.state?.toLowerCase().replace('-', '_')] ?? 'aberto',
    criadoEm: a.createdAt ?? '',
    atribuidoA: a.attributedTo ?? undefined,
    notas: a.notes ?? undefined,
  };
}

const tooltipStyle = {
  background: 'var(--color-card)',
  border: '1px solid var(--color-border)',
  borderRadius: '12px',
  color: 'var(--color-foreground)',
  fontSize: '0.8rem',
};

function getTrendFromVariation(variation: number): 'up' | 'down' {
  return variation > 0 ? 'up' : 'down';
}

function formatVariation(variation: number) {
  return `${variation > 0 ? '+' : ''}${variation.toFixed(1)}% vs ontem`;
}

export function DashboardManagerPage() {
  const [chartTab, setChartTab] = useState<ChartTab>('entradas');
  const [data, setData] = useState<ManagerDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchManagerDashboard()
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Erro ao carregar dados'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <i className="fas fa-spinner fa-spin text-primary" style={{ fontSize: '1.5rem' }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-64 text-destructive gap-2">
        <i className="fas fa-triangle-exclamation" />
        <span style={{ fontSize: '0.9rem' }}>{error ?? 'Sem dados disponíveis'}</span>
      </div>
    );
  }

  const { kpis, seriesLast7Days, occupancyPerZone, occupancyPerHour, lastAlerts, performancePerPark } = data;
  const alertasAbertos = lastAlerts.filter(a => a.state?.toLowerCase() === 'open' || a.state?.toLowerCase() === 'aberto');

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dashboard-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="px-4 py-5 max-w-screen-xl mx-auto space-y-6">
      <PageHeader onExport={handleExport} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon="fa-arrow-right-to-bracket" label="Entradas Hoje"   value={kpis.todayEntrances.toString()} subValue={formatVariation(kpis.entranceVariance)} trend={getTrendFromVariation(kpis.entranceVariance)} color="#7357ec" />
        <KpiCard icon="fa-chart-pie"              label="Taxa de Ocupação" value={`${kpis.averageOccupancy}%`}  subValue={`${kpis.occupiedLots} / ${kpis.totalLots} lugares`} trend="neutral" color="#5948a6" />
        <KpiCard icon="fa-euro-sign"              label="Receita Hoje"    value={`€${Number(kpis.totalEarnings).toFixed(2)}`} subValue={formatVariation(kpis.earningsVariance)} trend={getTrendFromVariation(kpis.earningsVariance)} color="#22c55e" />
        <KpiCard icon="fa-clock"                  label="Tempo Médio"     value={kpis.averageOccupancyTime} subValue={`${kpis.alertsOpened} alerta${kpis.alertsOpened !== 1 ? 's' : ''} em aberto`} trend={kpis.alertsOpened > 0 ? 'warn' : 'neutral'} color="#f59e0b" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DailyChart chartTab={chartTab} onTabChange={setChartTab} series={seriesLast7Days} />
        <ZoneDonut zones={occupancyPerZone} />
      </div>

      <HourlyChart series={occupancyPerHour} />

      <AlertsSection alerts={lastAlerts} alertasAbertos={alertasAbertos.length} />

      <ParkTable parks={performancePerPark} />
    </div>
  );
}

function PageHeader({ onExport }: { readonly onExport: () => void }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 className="text-foreground" style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.2 }}>Painel de Desempenho</h1>
        <p className="text-muted-foreground mt-1" style={{ fontSize: '0.875rem' }}>
          {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · Todos os parques
        </p>
      </div>
      <button
        onClick={onExport}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border hover:bg-muted transition-colors text-foreground"
        style={{ fontSize: '0.8rem', fontWeight: 600 }}
        aria-label="Exportar relatório"
      >
        <i className="fas fa-file-export text-primary" style={{ fontSize: '0.85rem' }} aria-hidden="true" />
        Exportar
      </button>
    </div>
  );
}

function DailyChart({ chartTab, onTabChange, series }: { readonly chartTab: ChartTab; readonly onTabChange: (t: ChartTab) => void; readonly series: DashboardDailyMetric[] }) {
  const yAxisTickFormatter = chartTab === 'receita' ? (v: number) => `€${v}` : undefined;
  const tooltipFormatter = (v: number) => {
    if (chartTab === 'receita') return [`€${v.toFixed(2)}`, 'Receita'];
    return [v, 'Entradas'];
  };
  const dataKey = chartTab === 'entradas' ? 'entrances' : 'earnings';

  return (
    <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-foreground" style={{ fontSize: '1rem', fontWeight: 700 }}>Últimos 7 Dias</h2>
        <div className="flex rounded-xl overflow-hidden border border-border">
          {(['entradas', 'receita'] as ChartTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`px-3 py-1.5 transition-colors ${chartTab === tab ? 'bg-primary text-white' : 'bg-card text-muted-foreground hover:bg-muted'}`}
              style={{ fontSize: '0.75rem', fontWeight: 600 }}
            >
              {tab === 'entradas' ? 'Entradas' : 'Receita'}
            </button>
          ))}
        </div>
      </div>
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%" key={`bar-container-${chartTab}`}>
          <BarChart key={`bar-chart-${chartTab}`} data={series} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="day" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={yAxisTickFormatter} />
            <Tooltip contentStyle={tooltipStyle} formatter={tooltipFormatter} />
            <Bar key={`bar-${chartTab}`} dataKey={dataKey} fill="#7357ec" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ZoneDonut({ zones }: { readonly zones: DashboardZoneOccupancy[] }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <h2 className="text-foreground mb-4" style={{ fontSize: '1rem', fontWeight: 700 }}>Ocupação por Zona</h2>
      <div style={{ height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={zones} dataKey="occupied" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3}>
              {zones.map((zone) => <Cell key={zone.name} fill={zoneColor(zone.type)} />)}
            </Pie>
            <Tooltip contentStyle={{ ...tooltipStyle, borderRadius: '10px', fontSize: '0.78rem' }} formatter={(v: number, name: string) => [`${v} ocupados`, name]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-1.5 mt-1">
        {zones.map((zone) => {
          const pct = zone.total > 0 ? Math.round((zone.occupied / zone.total) * 100) : 0;
          const color = zoneColor(zone.type);
          return (
            <div key={zone.name} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} aria-hidden="true" />
              <span className="text-foreground flex-1" style={{ fontSize: '0.72rem' }}>{zone.name}</span>
              <span className="text-muted-foreground" style={{ fontSize: '0.72rem' }}>{zone.occupied}/{zone.total}</span>
              <span className="px-1.5 py-0.5 rounded-full" style={{ fontSize: '0.65rem', fontWeight: 700, background: `${color}22`, color }}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HourlyChart({ series }: { readonly series: DashboardHourlyOccupancy[] }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <h2 className="text-foreground mb-4" style={{ fontSize: '1rem', fontWeight: 700 }}>Ocupação por Hora — Hoje</h2>
      <div style={{ height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="gradOcup" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#7357ec" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#7357ec" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="time" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
            <Tooltip contentStyle={{ ...tooltipStyle, borderRadius: '10px', fontSize: '0.78rem' }} formatter={(v: number) => [`${v}%`, 'Ocupação']} />
            <Area type="monotone" dataKey="occupancy" stroke="#7357ec" strokeWidth={2.5} fill="url(#gradOcup)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AlertsSection({ alerts, alertasAbertos }: { readonly alerts: DashboardAlertSummary[]; readonly alertasAbertos: number }) {
  const issues = alerts.slice(0, 5).map(mapAlertToIssue);
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-foreground" style={{ fontSize: '1rem', fontWeight: 700 }}>Alertas Recentes</h2>
        <span className="px-2 py-0.5 rounded-full bg-destructive/15 text-destructive" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
          {alertasAbertos} em aberto
        </span>
      </div>
      <div className="space-y-2">
        {issues.map((issue) => <AlertRow key={issue.id} issue={issue} />)}
      </div>
      <a href="/manager/tariffs-incidents" className="mt-3 flex items-center gap-1.5 text-primary hover:opacity-80 transition-opacity" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
        Ver todos os registos
        <i className="fas fa-arrow-right" style={{ fontSize: '0.75rem' }} aria-hidden="true" />
      </a>
    </div>
  );
}

function ParkTable({ parks }: { readonly parks: DashboardParkSummary[] }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <h2 className="text-foreground mb-4" style={{ fontSize: '1rem', fontWeight: 700 }}>Desempenho por Parque — Hoje</h2>
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full" style={{ fontSize: '0.8rem', minWidth: '520px' }}>
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-muted-foreground pb-2" style={{ fontWeight: 600 }}>Parque</th>
              <th className="text-center text-muted-foreground pb-2" style={{ fontWeight: 600 }}>Entradas</th>
              <th className="text-center text-muted-foreground pb-2" style={{ fontWeight: 600 }}>Ocupação</th>
              <th className="text-right text-muted-foreground pb-2" style={{ fontWeight: 600 }}>Receita</th>
            </tr>
          </thead>
          <tbody>
            {parks.map((row) => (
              <tr key={row.name} className="border-b border-border/50 last:border-0">
                <td className="py-2.5 text-foreground" style={{ fontWeight: 500 }}>
                  {row.name}
                  <span className="ml-1.5 text-muted-foreground" style={{ fontSize: '0.7rem' }}>{row.city}</span>
                </td>
                <td className="py-2.5 text-center text-foreground">{row.entrances}</td>
                <td className="py-2.5 text-center"><OccBar pct={row.occupancyPercentage} /></td>
                <td className="py-2.5 text-right text-foreground" style={{ fontWeight: 600 }}>€{Number(row.earnings).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
