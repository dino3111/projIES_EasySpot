import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell,
} from 'recharts';
import type { IssueReport } from '../../data/gestorData';
import { KpiCard, AlertRow, OccBar } from './components/shared';
import {
  dashboardApi,
  ZONE_COLORS,
  type ManagerDashboardResponse,
  type AlertSummary,
  type ZoneOccupancy,
} from '../../services/dashboardApi';

type ChartTab = 'entradas' | 'receita';

const emptyDailyMetrics: Array<{ day: string; entradas: number; receita: number }> = [];
const emptyHourlyOccupancy: Array<{ hora: string; ocupacao: number }> = [];
const emptyZoneOccupancy: Array<{ name: string; total: number; ocupados: number; color: string }> = [];
const emptyIssues: IssueReport[] = [];

const kpis = {
  entradasHoje: 0,
  variacaoEntradas: 0,
  taxaOcupacaoMedia: 0,
  totalLugares: 0,
  lugaresLivres: 0,
  receitaHoje: 0,
  variacaoReceita: 0,
  tempoMedioEstadia: '0 min',
  alertasAbertos: 0,
};

const parkSummaryRows = [
  { nome: 'Fórum Aveiro',      cidade: 'Aveiro',   entradas: 58, ocupacao: 74, receita: 342.50 },
  { nome: 'Glicínias Plaza',   cidade: 'Aveiro',   entradas: 42, ocupacao: 61, receita: 198.20 },
  { nome: 'Estádio Coimbra',   cidade: 'Coimbra',  entradas: 37, ocupacao: 69, receita: 215.10 },
  { nome: 'CoimbraShopping',   cidade: 'Coimbra',  entradas: 29, ocupacao: 55, receita: 131.40 },
  { nome: 'Europa',            cidade: 'Leiria',   entradas: 44, ocupacao: 78, receita: 284 },
  { nome: 'Foz Plaza',         cidade: 'Figueira', entradas: 61, ocupacao: 82, receita: 398.60 },
  { nome: 'Mercado Arganil',   cidade: 'Arganil',  entradas: 18, ocupacao: 45, receita: 64.20  },
  { nome: 'Furadouro',         cidade: 'Ovar',     entradas: 14, ocupacao: 30, receita: 32.10  },
  { nome: 'Est. Mag. Pessoa',  cidade: 'Leiria',   entradas:  0, ocupacao:  0, receita: 79.5  },
];

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
  const alertasAbertos = emptyIssues.filter((i) => i.estado === 'aberto');

  return (
    <div className="px-4 py-5 max-w-screen-xl mx-auto space-y-6">
      <PageHeader />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon="fa-arrow-right-to-bracket"
          label="Entradas Hoje"
          value={kpis.todayEntrances.toString()}
          subValue={formatVariation(kpis.entranceVariance)}
          trend={getTrendFromVariation(kpis.entranceVariance)}
          color="#7357ec"
        />
        <KpiCard
          icon="fa-chart-pie"
          label="Taxa de Ocupação"
          value={`${kpis.averageOccupancy}%`}
          subValue={`${kpis.occupiedLots} / ${kpis.totalLots} lugares`}
          trend="neutral"
          color="#5948a6"
        />
        <KpiCard
          icon="fa-euro-sign"
          label="Receita Hoje"
          value={`€${kpis.totalEarnings.toFixed(2)}`}
          subValue={formatVariation(kpis.earningsVariance)}
          trend={getTrendFromVariation(kpis.earningsVariance)}
          color="#22c55e"
        />
        <KpiCard
          icon="fa-clock"
          label="Tempo Médio"
          value={kpis.averageOccupancyTime}
          subValue={`${kpis.alertsOpened} alerta${kpis.alertsOpened !== 1 ? 's' : ''} em aberto`}
          trend={kpis.alertsOpened > 0 ? 'warn' : 'neutral'}
          color="#f59e0b"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DailyChart chartTab={chartTab} onTabChange={setChartTab} seriesLast7Days={seriesLast7Days} />
        <ZoneDonut occupancyPerZone={occupancyPerZone} />
      </div>

      <HourlyChart occupancyPerHour={occupancyPerHour} />

      <AlertsSection alertasAbertos={alertasAbertos} allAlerts={lastAlerts} />

      <ParkTable performancePerPark={performancePerPark} />
    </div>
  );
}

function PageHeader() {
  const today = new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 className="text-foreground" style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.2 }}>Painel de Desempenho</h1>
        <p className="text-muted-foreground mt-1" style={{ fontSize: '0.875rem' }}>{today} · Todos os parques</p>
      </div>
      <button
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

function DailyChart({
  chartTab,
  onTabChange,
  seriesLast7Days,
}: {
  readonly chartTab: ChartTab;
  readonly onTabChange: (t: ChartTab) => void;
  readonly seriesLast7Days: ManagerDashboardResponse['seriesLast7Days'];
}) {
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
          <BarChart key={`bar-chart-${chartTab}`} data={emptyDailyMetrics} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
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

function ZoneDonut() {
  const hasData = emptyZoneOccupancy.length > 0;
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <h2 className="text-foreground mb-4" style={{ fontSize: '1rem', fontWeight: 700 }}>Ocupação por Zona</h2>
      <div style={{ height: 160 }}>
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={emptyZoneOccupancy} dataKey="ocupados" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3}>
                {emptyZoneOccupancy.map((zone) => <Cell key={zone.name} fill={zone.color} />)}
              </Pie>
              <Tooltip contentStyle={{ ...tooltipStyle, borderRadius: '10px', fontSize: '0.78rem' }} formatter={(v: number, name: string) => [`${v} ocupados`, name]} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground" style={{ fontSize: '0.8rem' }}>
            Sem dados disponíveis
          </div>
        )}
      </div>
      <div className="space-y-1.5 mt-1">
        {emptyZoneOccupancy.map((zone) => {
          const pct = Math.round((zone.ocupados / zone.total) * 100);
          return (
            <div key={zone.name} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: zone.color }} aria-hidden="true" />
              <span className="text-foreground flex-1" style={{ fontSize: '0.72rem' }}>{zone.name}</span>
              <span className="text-muted-foreground" style={{ fontSize: '0.72rem' }}>{zone.occupied}/{zone.total}</span>
              <span className="px-1.5 py-0.5 rounded-full" style={{ fontSize: '0.65rem', fontWeight: 700, background: `${zone.color}22`, color: zone.color }}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HourlyChart({ occupancyPerHour }: { readonly occupancyPerHour: ManagerDashboardResponse['occupancyPerHour'] }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <h2 className="text-foreground mb-4" style={{ fontSize: '1rem', fontWeight: 700 }}>Ocupação por Hora — Hoje</h2>
      <div style={{ height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={emptyHourlyOccupancy} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="gradOcup" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7357ec" stopOpacity={0.3} />
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

function AlertsSection({ alertasAbertos }: { readonly alertasAbertos: IssueReport[] }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-foreground" style={{ fontSize: '1rem', fontWeight: 700 }}>Alertas Recentes</h2>
        <span className="px-2 py-0.5 rounded-full bg-destructive/15 text-destructive" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
          {alertasAbertos.length} em aberto
        </span>
      </div>
      <div className="space-y-2">
        {alertasAbertos.length > 0 ? (
          alertasAbertos.slice(0, 5).map((issue) => <AlertRow key={issue.id} issue={issue} />)
        ) : (
          <div className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-muted-foreground" style={{ fontSize: '0.8rem' }}>
            Sem alertas em aberto
          </div>
        )}
      </div>
      <a href="/manager/tariffs-incidents" className="mt-3 flex items-center gap-1.5 text-primary hover:opacity-80 transition-opacity" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
        Ver todos os registos
        <i className="fas fa-arrow-right" style={{ fontSize: '0.75rem' }} aria-hidden="true" />
      </a>
    </div>
  );
}

function ParkTable({ performancePerPark }: { readonly performancePerPark: ManagerDashboardResponse['performancePerPark'] }) {
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
            {performancePerPark.map((row) => (
              <tr key={row.name} className="border-b border-border/50 last:border-0">
                <td className="py-2.5 text-foreground" style={{ fontWeight: 500 }}>
                  {row.name}
                  <span className="ml-1.5 text-muted-foreground" style={{ fontSize: '0.7rem' }}>{row.city}</span>
                </td>
                <td className="py-2.5 text-center text-foreground">{row.entrances}</td>
                <td className="py-2.5 text-center"><OccBar pct={row.occupancyPercentage} /></td>
                <td className="py-2.5 text-right text-foreground" style={{ fontWeight: 600 }}>€{row.earnings.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
