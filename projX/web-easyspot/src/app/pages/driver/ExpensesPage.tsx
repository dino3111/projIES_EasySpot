import { useMemo, useState } from 'react';
import { mockExpenses } from './costs/costsHelpers';
import type { Expense } from '../../data/parkingTypes';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';

type Period = '7d' | '30d' | '3m';
type VehicleFilter = string;

// Enriquecer mock com mais entradas para os gráficos
const allExpenses: (Expense & { vehicle?: string })[] = [
  ...mockExpenses,
  { id: 'exp-6',  parkingLotName: 'Parque das Gaivotas', date: '2026-03-06', duration: '1h 30m', amount: 2.10, vehicle: 'Seat Ibiza' },
  { id: 'exp-7',  parkingLotName: 'Estação Ferroviária de Ovar', date: '2026-03-04', duration: '2h 00m', amount: 1.60, vehicle: 'Seat Ibiza' },
  {
    id: 'exp-8',  parkingLotName: 'Fórum Aveiro', date: '2026-03-03', duration: '1h 15m', amount: 1.88, vehicle: 'Renault Zoe',
    evCharging: { kWh: 14, chargerType: 'Type 2 (7kW)', chargingAmount: 3.92 },
  },
  {
    id: 'exp-9',  parkingLotName: 'Estádio Municipal Dr. Magalhães Pessoa', date: '2026-02-27', duration: '4h 00m', amount: 7.20, vehicle: 'Renault Zoe',
    evCharging: { kWh: 22, chargerType: 'CCS (50kW)', chargingAmount: 9.24 },
  },
  { id: 'exp-10', parkingLotName: 'Estação Ferroviária de Ovar', date: '2026-02-22', duration: '1h 00m', amount: 0.80, vehicle: 'Seat Ibiza' },
  { id: 'exp-11', parkingLotName: 'Parque das Gaivotas', date: '2026-02-18', duration: '6h 00m', amount: 8.40, vehicle: 'Seat Ibiza' },
  { id: 'exp-12', parkingLotName: 'Mercado Municipal de Arganil', date: '2026-02-15', duration: '0h 30m', amount: 0.30, vehicle: 'Seat Ibiza' },
  {
    id: 'exp-13', parkingLotName: 'Estádio Cidade de Coimbra', date: '2026-02-10', duration: '3h 00m', amount: 5.40, vehicle: 'Renault Zoe',
    evCharging: { kWh: 12.5, chargerType: 'CCS (50kW)', chargingAmount: 5.25 },
  },
  { id: 'exp-14', parkingLotName: 'Parque de São Domingos', date: '2026-01-28', duration: '4h 30m', amount: 7.20, vehicle: 'Seat Ibiza' },
  {
    id: 'exp-15', parkingLotName: 'Fórum Aveiro', date: '2026-01-20', duration: '2h 00m', amount: 3.00, vehicle: 'Renault Zoe',
    evCharging: { kWh: 8, chargerType: 'Type 2 (7kW)', chargingAmount: 2.24 },
  },
];

const COLORS = ['#7357ec', '#22c55e', '#f59e0b', '#06b6d4', '#ec4899'];
const PERIOD_DAYS: Record<Period, number> = { '7d': 7, '30d': 30, '3m': 90 };

function filterByPeriod(expenses: typeof allExpenses, period: Period) {
  const now = new Date('2026-03-07');
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - PERIOD_DAYS[period]);
  return expenses.filter((e) => new Date(e.date) >= cutoff);
}

function buildAreaData(expenses: typeof allExpenses, period: Period) {
  const days = PERIOD_DAYS[period];
  const map: Record<string, number> = {};
  const now = new Date('2026-03-07');

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    map[key] = 0;
  }
  expenses.forEach((e) => {
    const total = e.amount + (e.evCharging?.chargingAmount ?? 0);
    if (map[e.date] !== undefined) map[e.date] += total;
  });

  return Object.entries(map).map(([date, total]) => ({
    date: new Date(date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }),
    total,
  }));
}

function buildPieData(expenses: typeof allExpenses) {
  const map: Record<string, number> = {};
  expenses.forEach((e) => {
    const total = e.amount + (e.evCharging?.chargingAmount ?? 0);
    map[e.parkingLotName] = (map[e.parkingLotName] ?? 0) + total;
  });
  return Object.entries(map)
    .map(([name, value]) => ({ name: name, value: +value.toFixed(2) }))
    .sort((a, b) => b.value - a.value);
}

function buildVehicleData(expenses: typeof allExpenses) {
  const map: Record<string, number> = {};
  expenses.forEach((e) => {
    const v = e.vehicle ?? 'Seat Ibiza';
    const total = e.amount + (e.evCharging?.chargingAmount ?? 0);
    map[v] = (map[v] ?? 0) + total;
  });
  return Object.entries(map).map(([name, total]) => ({ name, total: +total.toFixed(2) }));
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-base-100 dark:bg-base-200 border border-base-300/40 rounded-xl px-3 py-2 shadow-xl text-sm">
        <p className="text-base-content/60 text-xs mb-0.5">{label}</p>
        <p className="font-bold text-primary">€{payload[0].value.toFixed(2)}</p>
      </div>
    );
  }
  return null;
};

const uniqueVehicles = Array.from(
  new Set(allExpenses.flatMap((e) => (e.vehicle ? [e.vehicle] : []))),
);

function getXAxisInterval(period: Period) {
  if (period === '7d') return 0;
  if (period === '30d') return 5;
  return 14;
}

export function ExpensesPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const [vehicleFilter, setVehicleFilter] = useState<VehicleFilter>('all');

  const filtered = useMemo(() => {
    const byPeriod = filterByPeriod(allExpenses, period);
    if (vehicleFilter === 'all') return byPeriod;
    return byPeriod.filter((e) => e.vehicle === vehicleFilter);
  }, [period, vehicleFilter]);
  const totalSpent = useMemo(() => filtered.reduce((a, e) => a + e.amount + (e.evCharging?.chargingAmount ?? 0), 0), [filtered]);
  const totalParking = useMemo(() => filtered.reduce((a, e) => a + e.amount, 0), [filtered]);
  const totalEV = useMemo(() => filtered.reduce((a, e) => a + (e.evCharging?.chargingAmount ?? 0), 0), [filtered]);
  const avgPerSession = filtered.length > 0 ? totalSpent / filtered.length : 0;
    const mostFrequent = useMemo(() => {
      if (filtered.length === 0) return '—';
      const counts: Record<string, number> = {};
      filtered.forEach((e) => { counts[e.parkingLotName] = (counts[e.parkingLotName] ?? 0) + 1; });
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
    }, [filtered]);
  const maxExpense = useMemo(() => Math.max(...filtered.map((e) => e.amount + (e.evCharging?.chargingAmount ?? 0)), 0), [filtered]);

  const areaData = useMemo(() => buildAreaData(filtered, period), [filtered, period]);
  const pieData = useMemo(() => buildPieData(filtered), [filtered]);
  const vehicleData = useMemo(() => buildVehicleData(filtered), [filtered]);

  const periods: { id: Period; label: string }[] = [
    { id: '7d', label: '7 dias' },
    { id: '30d', label: '30 dias' },
    { id: '3m', label: '3 meses' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-5">
      {/* Cabeçalho */}
      <div className="mb-5 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-foreground font-extrabold" style={{ fontSize: '1.5rem', lineHeight: 1.2 }}>
            Os Meus Gastos
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Histórico de pagamentos e faturação automática</p>
        </div>
        {/* Toggle de período */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl">
          {periods.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                period === p.id
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filtro de veículo */}
      {uniqueVehicles.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-muted-foreground font-semibold flex-shrink-0" style={{ fontSize: '0.78rem' }}>
            <i className="fas fa-car mr-1 text-primary/70" />
            Veículo:
          </span>
          <div className="relative flex items-center">
            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              aria-label="Filtrar por veículo"
              className="rounded-xl border border-border bg-card text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all appearance-none pl-3 pr-7"
              style={{ fontSize: '0.82rem', paddingTop: '0.4rem', paddingBottom: '0.4rem' }}
            >
              <option value="all">Todos os veículos</option>
              {uniqueVehicles.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            <i className="fas fa-chevron-down text-muted-foreground pointer-events-none absolute right-2.5" style={{ fontSize: '0.6rem' }} />
          </div>
        </div>
      )}

      {/* ─── KPI Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total gasto', value: `€${totalSpent.toFixed(2)}`, icon: 'fa-wallet', color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Média/sessão', value: `€${avgPerSession.toFixed(2)}`, icon: 'fa-chart-line', color: 'text-success', bg: 'bg-success/10' },
          { label: 'Mais frequente', value: mostFrequent, icon: 'fa-map-pin', color: 'text-warning', bg: 'bg-warning/10' },
          { label: 'Sessão mais cara', value: `€${maxExpense.toFixed(2)}`, icon: 'fa-arrow-trend-up', color: 'text-error', bg: 'bg-error/10' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-card rounded-2xl p-4 border border-border/40 shadow-sm">
            <div className={`w-9 h-9 rounded-xl ${kpi.bg} flex items-center justify-center mb-2.5`}>
              <i className={`fas ${kpi.icon} ${kpi.color} text-sm`} aria-hidden="true" />
            </div>
            <p className="text-foreground font-extrabold text-lg leading-none">{kpi.value}</p>
            <p className="text-muted-foreground text-xs mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* ─── Resumo Estacionamento vs EV ────────────────────────────────── */}
      {totalEV > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-2xl p-4 border border-border/40 bg-card shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <i className="fas fa-square-parking text-primary text-base" aria-hidden="true" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Estacionamento</p>
              <p className="text-foreground font-extrabold text-base">€{totalParking.toFixed(2)}</p>
            </div>
          </div>
          <div className="rounded-2xl p-4 border border-success/30 bg-success/5 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/15 flex items-center justify-center flex-shrink-0">
              <i className="fas fa-charging-station text-success text-base" aria-hidden="true" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Carregamento EV</p>
              <p className="text-success font-extrabold text-base">€{totalEV.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Gráfico de área: gastos ao longo do tempo ─────────────────── */}
      <div className="bg-card rounded-2xl p-5 border border-border/40 shadow-sm mb-4">
        <h2 className="text-foreground font-bold text-sm mb-4 flex items-center gap-2">
          <i className="fas fa-chart-area text-primary" aria-hidden="true" />
          Gastos ao longo do tempo
        </h2>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={areaData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7357ec" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#7357ec" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              interval={getXAxisInterval(period)}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              tickFormatter={(v) => `€${v}`}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#7357ec"
              strokeWidth={2.5}
              fill="url(#colorTotal)"
              dot={false}
              activeDot={{ r: 5, fill: '#7357ec', strokeWidth: 2, stroke: 'white' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ─── Gráficos lado a lado: Donut + Barras ──────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Donut: por parque – responsivo */}
        <div className="bg-card rounded-2xl p-5 border border-border/40 shadow-sm">
          <h2 className="text-foreground font-bold text-sm mb-3 flex items-center gap-2">
            <i className="fas fa-chart-pie text-primary" aria-hidden="true" />
            Gasto por parque
          </h2>
          {/* Donut centralizado */}
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={62}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {pieData.map((entry, i) => (
                  <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number) => [`€${v.toFixed(2)}`, '']}
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.75rem', fontSize: '0.75rem' }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Legenda abaixo do gráfico */}
          <div className="mt-3 space-y-1.5">
            {pieData.map((entry, i) => (
              <div key={entry.name} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-foreground/70 text-xs truncate">{entry.name}</span>
                </div>
                <span className="text-foreground font-bold text-xs flex-shrink-0">€{entry.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Barras: por veículo */}
        <div className="bg-card rounded-2xl p-5 border border-border/40 shadow-sm">
          <h2 className="text-foreground font-bold text-sm mb-3 flex items-center gap-2">
            <i className="fas fa-car text-primary" aria-hidden="true" />
            Gasto por veículo
          </h2>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={vehicleData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                tickFormatter={(v) => `€${v}`}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={60}>
                {vehicleData.map((entry, i) => (
                  <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Histórico ─────────────────────────────────────────────────── */}
      <h2 className="text-foreground font-bold mb-3" style={{ fontSize: '1rem' }}>
        Histórico de Estacionamento
      </h2>
      <div className="rounded-2xl border border-border/40 overflow-hidden mb-6 bg-card shadow-sm">
        {filtered
          .slice()
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .map((expense, idx) => {
            const evCharging = expense.evCharging;
            const hasEV = evCharging !== undefined;
            const totalAmount = expense.amount + (evCharging?.chargingAmount ?? 0);
            return (
              <div
                key={expense.id}
                className={`px-4 py-3.5 ${
                  idx < filtered.length - 1 ? 'border-b border-border/40' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${hasEV ? 'bg-success/15' : 'bg-primary/10'}`}>
                      <i className={`fas ${hasEV ? 'fa-charging-station text-success' : 'fa-receipt text-primary'} text-xs`} aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-foreground font-semibold text-sm">{expense.parkingLotName}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-muted-foreground text-xs">
                          {new Date(expense.date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </span>
                        <span className="text-muted-foreground/30">•</span>
                        <span className="text-muted-foreground text-xs">{expense.duration}</span>
                        {expense.vehicle && vehicleFilter === 'all' && (
                          <>
                            <span className="text-muted-foreground/30">•</span>
                            <span className="text-muted-foreground text-xs">
                              <i className="fas fa-car mr-1" style={{ fontSize: '0.65rem' }} />
                              {expense.vehicle}
                            </span>
                          </>
                        )}
                        {hasEV && (
                          <>
                            <span className="text-muted-foreground/30">•</span>
                            <span className="flex items-center gap-1 text-success text-xs font-semibold">
                              <i className="fas fa-bolt" aria-hidden="true" />
                              {evCharging.kWh} kWh · {evCharging.chargerType}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="font-extrabold text-sm" style={{ color: 'var(--color-primary-purple)' }}>
                      €{totalAmount.toFixed(2)}
                    </p>
                    {hasEV ? (
                      <div className="text-right">
                        <span className="text-muted-foreground font-medium text-[0.6rem] block">
                          Park €{expense.amount.toFixed(2)} + EV €{evCharging.chargingAmount.toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground font-medium uppercase text-[0.6rem]">Via OCR</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* ─── Info faturação ─────────────────────────────────────────────── */}
      <div className="rounded-xl p-4 flex items-start gap-3 bg-primary/5 border border-primary/20 mb-4">
        <i className="fas fa-circle-info mt-0.5 text-primary" aria-hidden="true" />
        <div className="leading-relaxed text-xs">
          <p className="font-bold mb-1 text-foreground">Faturação Automática</p>
          <p className="text-muted-foreground">
            As suas despesas são processadas automaticamente à saída através do sistema OCR.
            As faturas são enviadas para o seu email registado.
          </p>
        </div>
      </div>

      {/* ─── Info faturação EV ──────────────────────────────────────────── */}
      <div className="rounded-xl p-4 flex items-start gap-3 bg-success/5 border border-success/20">
        <i className="fas fa-charging-station mt-0.5 text-success" aria-hidden="true" />
        <div className="leading-relaxed text-xs">
          <p className="font-bold mb-1 text-foreground">Carregamento de Veículos Elétricos</p>
          <p className="text-muted-foreground">
            O custo de carregamento EV é faturado separadamente com base nos kWh consumidos.
            A sessão de carregamento é registada automaticamente via OCR e aparece discriminada na fatura.
          </p>
        </div>
      </div>
    </div>
  );
}
