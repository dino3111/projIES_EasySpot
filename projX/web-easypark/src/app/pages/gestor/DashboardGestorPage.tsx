import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell,
} from 'recharts';
import {
  mockDailyMetrics,
  mockHourlyOccupancy,
  mockZoneOccupancy,
  mockManagerKPIs,
  mockIssues,
  type IssueReport,
} from '../../data/gestorData';

type ChartTab = 'entradas' | 'receita';

export function DashboardGestorPage() {
  const [chartTab, setChartTab] = useState<ChartTab>('entradas');

  const kpis = mockManagerKPIs;
  const alertasAbertos = mockIssues.filter(i => i.estado === 'aberto');

  return (
    <div className="px-4 py-5 max-w-screen-xl mx-auto space-y-6">

      {/* ── Cabeçalho ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1
            className="text-foreground"
            style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.2 }}
          >
            Painel de Desempenho
          </h1>
          <p className="text-muted-foreground mt-1" style={{ fontSize: '0.875rem' }}>
            Segunda-feira, 9 de março de 2026 · Todos os parques
          </p>
        </div>
        <div className="flex items-center gap-2">
          
          <button
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border hover:bg-muted transition-colors text-foreground"
            style={{ fontSize: '0.8rem', fontWeight: 600 }}
            aria-label="Exportar relatório"
          >
            <i className="fas fa-file-export text-primary" style={{ fontSize: '0.85rem' }} aria-hidden="true"></i>
            Exportar
          </button>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon="fa-arrow-right-to-bracket"
          label="Entradas Hoje"
          value={kpis.entradasHoje.toString()}
          subValue={`${kpis.variacaoEntradas > 0 ? '+' : ''}${kpis.variacaoEntradas}% vs ontem`}
          trend={kpis.variacaoEntradas > 0 ? 'up' : 'down'}
          color="#7357ec"
        />
        <KpiCard
          icon="fa-chart-pie"
          label="Taxa de Ocupação"
          value={`${kpis.taxaOcupacaoMedia}%`}
          subValue={`${kpis.totalLugares - kpis.lugaresLivres} / ${kpis.totalLugares} lugares`}
          trend="neutral"
          color="#5948a6"
        />
        <KpiCard
          icon="fa-euro-sign"
          label="Receita Hoje"
          value={`€${kpis.receitaHoje.toFixed(2)}`}
          subValue={`${kpis.variacaoReceita > 0 ? '+' : ''}${kpis.variacaoReceita}% vs ontem`}
          trend={kpis.variacaoReceita > 0 ? 'up' : 'down'}
          color="#22c55e"
        />
        <KpiCard
          icon="fa-clock"
          label="Tempo Médio"
          value={kpis.tempoMedioEstadia}
          subValue={`${kpis.alertasAbertos} alerta${kpis.alertasAbertos !== 1 ? 's' : ''} em aberto`}
          trend={kpis.alertasAbertos > 0 ? 'warn' : 'neutral'}
          color="#f59e0b"
        />
      </div>

      {/* ── Gráficos principais ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Gráfico de barras: entradas ou receita */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-foreground" style={{ fontSize: '1rem', fontWeight: 700 }}>
              Últimos 7 Dias
            </h2>
            <div className="flex rounded-xl overflow-hidden border border-border">
              <button
                onClick={() => setChartTab('entradas')}
                className={`px-3 py-1.5 transition-colors ${
                  chartTab === 'entradas'
                    ? 'bg-primary text-white'
                    : 'bg-card text-muted-foreground hover:bg-muted'
                }`}
                style={{ fontSize: '0.75rem', fontWeight: 600 }}
              >
                Entradas
              </button>
              <button
                onClick={() => setChartTab('receita')}
                className={`px-3 py-1.5 transition-colors ${
                  chartTab === 'receita'
                    ? 'bg-primary text-white'
                    : 'bg-card text-muted-foreground hover:bg-muted'
                }`}
                style={{ fontSize: '0.75rem', fontWeight: 600 }}
              >
                Receita
              </button>
            </div>
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%" key={`bar-container-${chartTab}`}>
              <BarChart
                key={`bar-chart-${chartTab}`}
                id="bar-chart-daily"
                data={mockDailyMetrics}
                margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="day"
                  tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={chartTab === 'receita' ? (v) => `€${v}` : undefined}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '12px',
                    color: 'var(--color-foreground)',
                    fontSize: '0.8rem',
                  }}
                  formatter={(v: number) =>
                    chartTab === 'receita' ? [`€${v.toFixed(2)}`, 'Receita'] : [v, 'Entradas']
                  }
                />
                <Bar
                  key={`bar-${chartTab}`}
                  dataKey={chartTab === 'entradas' ? 'entradas' : 'receita'}
                  fill="#7357ec"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut: ocupação por zona */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h2 className="text-foreground mb-4" style={{ fontSize: '1rem', fontWeight: 700 }}>
            Ocupação por Zona
          </h2>
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%" key="pie-container">
              <PieChart id="pie-chart-zones">
                <Pie
                  key="pie-zones"
                  data={mockZoneOccupancy}
                  dataKey="ocupados"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                >
                  {mockZoneOccupancy.map((zone) => (
                    <Cell key={`pie-cell-${zone.name}`} fill={zone.color} />
                  ))}
                </Pie>
                <Tooltip
                  key="pie-tooltip"
                  contentStyle={{
                    background: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    color: 'var(--color-foreground)',
                  }}
                  formatter={(v: number, name: string) => [`${v} ocupados`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-1">
            {mockZoneOccupancy.map((zone) => {
              const pct = Math.round((zone.ocupados / zone.total) * 100);
              return (
                <div key={`legend-${zone.name}`} className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: zone.color }}
                    aria-hidden="true"
                  />
                  <span className="text-foreground flex-1" style={{ fontSize: '0.72rem' }}>{zone.name}</span>
                  <span className="text-muted-foreground" style={{ fontSize: '0.72rem' }}>
                    {zone.ocupados}/{zone.total}
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded-full"
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      background: `${zone.color}22`,
                      color: zone.color,
                    }}
                  >
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Ocupação por hora ─────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <h2 className="text-foreground mb-4" style={{ fontSize: '1rem', fontWeight: 700 }}>
          Ocupação por Hora — Hoje
        </h2>
        <div style={{ height: 160 }}>
          <ResponsiveContainer width="100%" height="100%" key="area-container">
            <AreaChart id="area-chart-hourly" data={mockHourlyOccupancy} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradOcup" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7357ec" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7357ec" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                key="area-xaxis"
                dataKey="hora"
                tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                key="area-yaxis"
                domain={[0, 100]}
                tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                key="area-tooltip"
                contentStyle={{
                  background: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  color: 'var(--color-foreground)',
                }}
                formatter={(v: number) => [`${v}%`, 'Ocupação']}
              />
              <Area
                key="area-data"
                type="monotone"
                dataKey="ocupacao"
                stroke="#7357ec"
                strokeWidth={2.5}
                fill="url(#gradOcup)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Alertas recentes ──────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-foreground" style={{ fontSize: '1rem', fontWeight: 700 }}>
            Alertas Recentes
          </h2>
          <span
            className="px-2 py-0.5 rounded-full bg-destructive/15 text-destructive"
            style={{ fontSize: '0.72rem', fontWeight: 700 }}
          >
            {alertasAbertos.length} em aberto
          </span>
        </div>
        <div className="space-y-2">
          {mockIssues.slice(0, 5).map((issue) => (
            <AlertRow key={issue.id} issue={issue} />
          ))}
        </div>
        <a
          href="/gestor/tarifas-ocorrencias"
          className="mt-3 flex items-center gap-1.5 text-primary hover:opacity-80 transition-opacity"
          style={{ fontSize: '0.8rem', fontWeight: 600 }}
        >
          Ver todos os registos
          <i className="fas fa-arrow-right" style={{ fontSize: '0.75rem' }} aria-hidden="true"></i>
        </a>
      </div>

      {/* ── Resumo por parque ─────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-foreground" style={{ fontSize: '1rem', fontWeight: 700 }}>
            Desempenho por Parque — Hoje
          </h2>
        </div>
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
              {parkSummaryRows.map((row, idx) => (
                <tr key={`${row.nome}-${idx}`} className="border-b border-border/50 last:border-0">
                  <td className="py-2.5 text-foreground" style={{ fontWeight: 500 }}>
                    {row.nome}
                    <span className="ml-1.5 text-muted-foreground" style={{ fontSize: '0.7rem' }}>
                      {row.cidade}
                    </span>
                  </td>
                  <td className="py-2.5 text-center text-foreground">{row.entradas}</td>
                  <td className="py-2.5 text-center">
                    <OccBar pct={row.ocupacao} />
                  </td>
                  <td className="py-2.5 text-right text-foreground" style={{ fontWeight: 600 }}>
                    €{row.receita.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function KpiCard({
  icon, label, value, subValue, trend, color,
}: {
  icon: string;
  label: string;
  value: string;
  subValue: string;
  trend: 'up' | 'down' | 'warn' | 'neutral';
  color: string;
}) {
  const trendColor =
    trend === 'up' ? '#22c55e' :
    trend === 'down' ? '#ef4444' :
    trend === 'warn' ? '#f59e0b' :
    'var(--color-muted-foreground)';

  const trendIcon =
    trend === 'up' ? 'fa-arrow-trend-up' :
    trend === 'down' ? 'fa-arrow-trend-down' :
    trend === 'warn' ? 'fa-triangle-exclamation' :
    'fa-minus';

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-start justify-between mb-2">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}20` }}
          aria-hidden="true"
        >
          <i className={`fas ${icon}`} style={{ color, fontSize: '1rem' }}></i>
        </div>
      </div>
      <p
        className="text-foreground"
        style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.1, marginTop: '0.25rem' }}
      >
        {value}
      </p>
      <p className="text-muted-foreground mt-0.5" style={{ fontSize: '0.72rem' }}>{label}</p>
      <div className="flex items-center gap-1 mt-1.5">
        <i className={`fas ${trendIcon}`} style={{ color: trendColor, fontSize: '0.65rem' }} aria-hidden="true"></i>
        <span style={{ fontSize: '0.7rem', color: trendColor, fontWeight: 600 }}>{subValue}</span>
      </div>
    </div>
  );
}

function AlertRow({ issue }: { issue: IssueReport }) {
  const sevColor =
    issue.severidade === 'critica' ? '#d4183d' :
    issue.severidade === 'aviso' ? '#f59e0b' : '#3b82f6';

  const sevLabel =
    issue.severidade === 'critica' ? 'Crítico' :
    issue.severidade === 'aviso' ? 'Aviso' : 'Info';

  const tipoIcon =
    issue.tipo === 'sensor' ? 'fa-microchip' :
    issue.tipo === 'sistema' ? 'fa-server' : 'fa-user';

  const estadoBadge =
    issue.estado === 'aberto' ? { label: 'Aberto', color: '#d4183d', bg: '#d4183d20' } :
    issue.estado === 'em-progresso' ? { label: 'Em progresso', color: '#f59e0b', bg: '#f59e0b20' } :
    { label: 'Resolvido', color: '#22c55e', bg: '#22c55e20' };

  return (
    <div className="flex items-start gap-3 rounded-xl p-3 bg-muted/30 border border-border/50">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: `${sevColor}15` }}
        aria-hidden="true"
      >
        <i className={`fas ${tipoIcon}`} style={{ color: sevColor, fontSize: '0.8rem' }}></i>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
          <span className="text-foreground" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
            {issue.parque}
          </span>
          {issue.zona && (
            <span className="text-muted-foreground" style={{ fontSize: '0.7rem' }}>· {issue.zona}</span>
          )}
          <span
            className="px-1.5 py-0.5 rounded-full"
            style={{ fontSize: '0.62rem', fontWeight: 700, background: `${sevColor}20`, color: sevColor }}
          >
            {sevLabel}
          </span>
          <span
            className="px-1.5 py-0.5 rounded-full"
            style={{ fontSize: '0.62rem', fontWeight: 700, background: estadoBadge.bg, color: estadoBadge.color }}
          >
            {estadoBadge.label}
          </span>
        </div>
        <p className="text-muted-foreground truncate" style={{ fontSize: '0.72rem' }}>
          {issue.descricao}
        </p>
        <p className="text-muted-foreground/70 mt-0.5" style={{ fontSize: '0.65rem' }}>
          {new Date(issue.criadoEm).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          {issue.atribuidoA ? ` · ${issue.atribuidoA}` : ''}
        </p>
      </div>
    </div>
  );
}

function OccBar({ pct }: { pct: number }) {
  const color = pct >= 85 ? '#d4183d' : pct >= 65 ? '#f59e0b' : '#22c55e';
  return (
    <div className="flex items-center gap-2 justify-center">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden" style={{ maxWidth: 80 }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span style={{ fontSize: '0.75rem', fontWeight: 600, color }}>{pct}%</span>
    </div>
  );
}

// ─── Dados de resumo por parque ───────────────────────────────────────────────
const parkSummaryRows = [
  { nome: 'Fórum Aveiro', cidade: 'Aveiro', entradas: 58, ocupacao: 74, receita: 342.50 },
  { nome: 'Glicínias Plaza', cidade: 'Aveiro', entradas: 42, ocupacao: 61, receita: 198.20 },
  { nome: 'Estádio Coimbra', cidade: 'Coimbra', entradas: 37, ocupacao: 69, receita: 215.10 },
  { nome: 'CoimbraShopping', cidade: 'Coimbra', entradas: 29, ocupacao: 55, receita: 131.40 },
  { nome: 'Europa', cidade: 'Leiria', entradas: 44, ocupacao: 78, receita: 284.00 },
  { nome: 'Foz Plaza', cidade: 'Figueira', entradas: 61, ocupacao: 82, receita: 398.60 },
  { nome: 'Mercado Arganil', cidade: 'Arganil', entradas: 18, ocupacao: 45, receita: 64.20 },
  { nome: 'Furadouro', cidade: 'Ovar', entradas: 14, ocupacao: 30, receita: 32.10 },
  { nome: 'Est. Mag. Pessoa', cidade: 'Leiria', entradas: 0, ocupacao: 0, receita: 79.50 },
];
