import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { mockExpenses, mockParkingLots, ParkingLot } from '../data/parkingData';
import type { Expense } from '../data/parkingData';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
  LineChart, Line,
} from 'recharts';

/* ════════════════════════════════════════════════════════════════════
   TIPOS E CONSTANTES PARTILHADAS
════════════════════════════════════════════════════════════════════ */
type Tab = 'gastos' | 'planeamento';

/* ════════════════════════════════════════════════════════════════════
   ABA GASTOS — dados e helpers
════════════════════════════════════════════════════════════════════ */
type Period = '7d' | '30d' | '3m';

const allExpenses: (Expense & { vehicle?: string })[] = [
  ...mockExpenses,
  { id: 'exp-6',  parkingLotName: 'Parque das Gaivotas',   date: '2026-03-06', duration: '1h 30m', amount: 2.10, vehicle: 'Seat Ibiza' },
  { id: 'exp-7',  parkingLotName: 'Estação Ferroviária de Ovar', date: '2026-03-04', duration: '2h 00m', amount: 1.60, vehicle: 'Seat Ibiza' },
  { id: 'exp-8',  parkingLotName: 'Fórum Aveiro',          date: '2026-03-03', duration: '1h 15m', amount: 1.88, vehicle: 'Renault Zoe',
    evCharging: { kWh: 14.0, chargerType: 'Type 2 (7kW)', chargingAmount: 3.92 } },
  { id: 'exp-9',  parkingLotName: 'Estádio Municipal Dr. Magalhães Pessoa', date: '2026-02-27', duration: '4h 00m', amount: 7.20, vehicle: 'Renault Zoe',
    evCharging: { kWh: 22.0, chargerType: 'CCS (50kW)', chargingAmount: 9.24 } },
  { id: 'exp-10', parkingLotName: 'Estação Ferroviária de Ovar', date: '2026-02-22', duration: '1h 00m', amount: 0.80, vehicle: 'Seat Ibiza' },
  { id: 'exp-11', parkingLotName: 'Parque das Gaivotas',   date: '2026-02-18', duration: '6h 00m', amount: 8.40, vehicle: 'Seat Ibiza' },
  { id: 'exp-12', parkingLotName: 'Mercado Municipal de Arganil', date: '2026-02-15', duration: '0h 30m', amount: 0.30, vehicle: 'Seat Ibiza' },
  { id: 'exp-13', parkingLotName: 'Estádio Cidade de Coimbra', date: '2026-02-10', duration: '3h 00m', amount: 5.40, vehicle: 'Renault Zoe',
    evCharging: { kWh: 12.5, chargerType: 'CCS (50kW)', chargingAmount: 5.25 } },
  { id: 'exp-14', parkingLotName: 'Parque de São Domingos', date: '2026-01-28', duration: '4h 30m', amount: 7.20, vehicle: 'Seat Ibiza' },
  { id: 'exp-15', parkingLotName: 'Fórum Aveiro',          date: '2026-01-20', duration: '2h 00m', amount: 3.00, vehicle: 'Renault Zoe',
    evCharging: { kWh: 8.0, chargerType: 'Type 2 (7kW)', chargingAmount: 2.24 } },
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
    map[d.toISOString().slice(0, 10)] = 0;
  }
  expenses.forEach((e) => {
    const total = e.amount + (e.evCharging?.chargingAmount ?? 0);
    if (map[e.date] !== undefined) map[e.date] += total;
  });
  return Object.entries(map).map(([date, total], index) => ({
    date: new Date(date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }),
    total,
    key: `${date}-${index}`,
  }));
}

function buildPieData(expenses: typeof allExpenses) {
  const map: Record<string, number> = {};
  expenses.forEach((e) => {
    const total = e.amount + (e.evCharging?.chargingAmount ?? 0);
    map[e.parkingLotName] = (map[e.parkingLotName] ?? 0) + total;
  });
  return Object.entries(map)
    .map(([name, value]) => ({ name, value: +value.toFixed(2) }))
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

/* ════════════════════════════════════════════════════════════════════
   ABA PLANEAMENTO — dados e helpers
════════════════════════════════════════════════════════════════════ */
type SortBy = 'price' | 'distance' | 'ratio';

interface ParkingWithCost extends ParkingLot {
  estimatedCost: number;
  costPerKm: number;
  occupancyForecast: Array<{ hour: string; occupancy: number }>;
}

function calculateCost(lot: ParkingLot, minutes: number): number {
  const baseCost = lot.hourlyRate * (minutes / 60);
  return baseCost > lot.dailyMax ? lot.dailyMax : baseCost;
}

function generateOccupancyForecast(lot: ParkingLot) {
  const currentHour = new Date().getHours();
  return Array.from({ length: 12 }, (_, i) => {
    const hour = (currentHour + i) % 24;
    let occupancy = ((lot.totalSpots - lot.availableSpots) / lot.totalSpots) * 100;
    if (hour >= 9 && hour <= 18) occupancy = Math.min(95, occupancy + Math.random() * 20);
    else if (hour >= 19 || hour <= 6) occupancy = Math.max(20, occupancy - Math.random() * 30);
    return { hour: `${String(hour).padStart(2, '0')}:00`, occupancy: Math.round(occupancy) };
  });
}

/* ════════════════════════════════════════════════════════════════════
   COMPONENTES DE TOOLTIP
════════════════════════════════════════════════════════════════════ */
function SpendTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-base-100 border border-base-300/40 rounded-xl px-3 py-2 shadow-xl text-sm">
      <p className="text-base-content/60 text-xs mb-0.5">{label}</p>
      <p className="font-bold text-primary">€{payload[0].value.toFixed(2)}</p>
    </div>
  );
}

function OccupancyTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border/40 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-muted-foreground text-xs mb-0.5">{label}</p>
      <p className="text-primary font-bold text-sm">{payload[0].value}%</p>
    </div>
  );
}

/* Chip reutilizável */
function Chip({ active, icon, label, onClick, ariaLabel }: {
  active: boolean; icon?: string; label: string; onClick: () => void; ariaLabel?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel ?? label}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all text-[0.8rem] font-medium ${
        active
          ? 'bg-primary border-primary text-white shadow-sm shadow-primary/20'
          : 'bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-primary'
      }`}
    >
      {icon && <i className={`fas ${icon}`} aria-hidden="true" style={{ fontSize: '0.75rem' }} />}
      {label}
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
════════════════════════════════════════════════════════════════════ */
export function CustosPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as Tab | null;
  const activeTab: Tab = tabParam === 'planeamento' ? 'planeamento' : 'gastos';

  function setTab(t: Tab) {
    setSearchParams(t === 'gastos' ? {} : { tab: t });
  }

  /* ── Estado da aba Gastos ── */
  const [period, setPeriod] = useState<Period>('30d');

  const filtered      = useMemo(() => filterByPeriod(allExpenses, period), [period]);
  const totalSpent    = useMemo(() => filtered.reduce((a, e) => a + e.amount + (e.evCharging?.chargingAmount ?? 0), 0), [filtered]);
  const totalParking  = useMemo(() => filtered.reduce((a, e) => a + e.amount, 0), [filtered]);
  const totalEV       = useMemo(() => filtered.reduce((a, e) => a + (e.evCharging?.chargingAmount ?? 0), 0), [filtered]);
  const avgPerSession = filtered.length > 0 ? totalSpent / filtered.length : 0;
  const mostFrequent  = useMemo(() => {
    if (filtered.length === 0) return '—';
    const counts: Record<string, number> = {};
    filtered.forEach((e) => { counts[e.parkingLotName] = (counts[e.parkingLotName] ?? 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
  }, [filtered]);
  const maxExpense    = useMemo(() => Math.max(...filtered.map((e) => e.amount + (e.evCharging?.chargingAmount ?? 0)), 0), [filtered]);
  const areaData      = useMemo(() => buildAreaData(filtered, period), [filtered, period]);
  const pieData       = useMemo(() => buildPieData(filtered), [filtered]);
  const vehicleData   = useMemo(() => buildVehicleData(filtered), [filtered]);

  const periods: { id: Period; label: string }[] = [
    { id: '7d', label: '7 dias' }, { id: '30d', label: '30 dias' }, { id: '3m', label: '3 meses' },
  ];

  /* ── Estado da aba Planeamento ── */
  const [durationHours, setDurationHours]       = useState(2);
  const [durationMinutes, setDurationMinutes]   = useState(0);
  const [selectedCity, setSelectedCity]         = useState<string | null>(null);
  const [filterEV, setFilterEV]                 = useState(false);
  const [filterAccessible, setFilterAccessible] = useState(false);
  const [maxDistance, setMaxDistance]           = useState(5);
  const [sortBy, setSortBy]                     = useState<SortBy>('ratio');

  const availableCities = useMemo(
    () => [...new Set(mockParkingLots.map((lot) => lot.localidade))].sort(),
    [],
  );
  const [expandedPark, setExpandedPark]         = useState<string | null>(null);

  const processedParks = useMemo<ParkingWithCost[]>(() => {
    const filtered = mockParkingLots.filter((lot) => {
      if (selectedCity && lot.localidade !== selectedCity) return false;
      if (filterEV && !lot.hasEVCharger) return false;
      if (filterAccessible && !lot.hasAccessible) return false;
      const distKm = parseFloat(lot.distance.replace(' km', '').replace(',', '.'));
      if (distKm > maxDistance) return false;
      return true;
    });
    const totalMinutes = durationHours * 60 + durationMinutes;
    const withCosts: ParkingWithCost[] = filtered.map((lot) => {
      const cost = calculateCost(lot, totalMinutes);
      const distKm = parseFloat(lot.distance.replace(' km', '').replace(',', '.'));
      return { ...lot, estimatedCost: cost, costPerKm: cost / distKm, occupancyForecast: generateOccupancyForecast(lot) };
    });
    withCosts.sort((a, b) => {
      if (sortBy === 'price') return a.estimatedCost - b.estimatedCost;
      if (sortBy === 'distance') {
        const dA = parseFloat(a.distance.replace(' km', '').replace(',', '.'));
        const dB = parseFloat(b.distance.replace(' km', '').replace(',', '.'));
        return dA - dB;
      }
      return a.costPerKm - b.costPerKm;
    });
    return withCosts;
  }, [durationHours, durationMinutes, selectedCity, filterEV, filterAccessible, maxDistance, sortBy]);

  const activeFilters = [filterEV, filterAccessible].filter(Boolean).length;

  /* ── Render ── */
  return (
    <div className="max-w-4xl mx-auto px-4 py-5">

      {/* ── Cabeçalho + Abas ────────────────────────────────────────── */}
      <div className="mb-5">
        <h1 className="text-foreground font-extrabold" style={{ fontSize: '1.5rem', lineHeight: 1.2 }}>
          Custos
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Histórico de gastos e comparador de tarifas</p>
      </div>

      {/* Abas */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit mb-6" role="tablist">
        {([
          { id: 'gastos' as Tab,      icon: 'fa-receipt',    label: 'Os Meus Gastos' },
          { id: 'planeamento' as Tab, icon: 'fa-calculator', label: 'Planeamento'     },
        ] as { id: Tab; icon: string; label: string }[]).map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === t.id
                ? 'bg-primary text-white shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <i className={`fas ${t.icon}`} aria-hidden="true" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════
          ABA: OS MEUS GASTOS
      ════════════════════════════════════════════════════════════ */}
      {activeTab === 'gastos' && (
        <div className="animate-in fade-in duration-200">

          {/* Toggle de período */}
          <div className="flex justify-end mb-5">
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

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total gasto',    value: `€${totalSpent.toFixed(2)}`,    icon: 'fa-wallet',         color: 'text-primary', bg: 'bg-primary/10' },
              { label: 'Média/sessão',   value: `€${avgPerSession.toFixed(2)}`, icon: 'fa-chart-line',     color: 'text-success', bg: 'bg-success/10' },
              { label: 'Mais frequente', value: mostFrequent,                   icon: 'fa-map-pin',        color: 'text-warning', bg: 'bg-warning/10' },
              { label: 'Sessão mais cara', value: `€${maxExpense.toFixed(2)}`,  icon: 'fa-arrow-trend-up', color: 'text-error',   bg: 'bg-error/10'   },
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

          {/* Resumo Estacionamento vs EV */}
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
              <div className="rounded-2xl p-4 border border-border/40 bg-card shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-charging-station text-primary text-base" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Carregamento EV</p>
                  <p className="text-foreground font-extrabold text-base">€{totalEV.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Gráfico de área */}
          <div className="bg-card rounded-2xl p-5 border border-border/40 shadow-sm mb-4">
            <h2 className="text-foreground font-bold text-sm mb-4 flex items-center gap-2">
              <i className="fas fa-chart-area text-primary" aria-hidden="true" />
              Gastos ao longo do tempo
            </h2>
            <div style={{ width: '100%', height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#7357ec" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7357ec" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  interval={period === '7d' ? 0 : period === '30d' ? 5 : 14} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickFormatter={(v) => `€${v}`} tickLine={false} axisLine={false} />
                <Tooltip content={<SpendTooltip />} />
                <Area type="monotone" dataKey="total" stroke="#7357ec" strokeWidth={2.5}
                  fill="url(#colorTotal)" dot={false}
                  activeDot={{ r: 5, fill: '#7357ec', strokeWidth: 2, stroke: 'white' }} />
              </AreaChart>
            </ResponsiveContainer>
            </div>
          </div>

          {/* Donut + Barras */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-card rounded-2xl p-5 border border-border/40 shadow-sm">
              <h2 className="text-foreground font-bold text-sm mb-3 flex items-center gap-2">
                <i className="fas fa-chart-pie text-primary" aria-hidden="true" />
                Gasto por parque
              </h2>
              <div style={{ width: '100%', height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={62} paddingAngle={2} dataKey="value" strokeWidth={0}>
                    {pieData.map((entry, i) => (
                      <Cell key={`pie-cell-${entry.name}-${i}`} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`€${v.toFixed(2)}`, '']}
                    contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.75rem', fontSize: '0.75rem' }} />
                </PieChart>
              </ResponsiveContainer>
              </div>
              <div className="mt-3 space-y-1.5">
                {pieData.map((entry, i) => (
                  <div key={entry.name} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-foreground/70 text-xs truncate">{entry.name}</span>
                    </div>
                    <span className="text-foreground font-bold text-xs flex-shrink-0">€{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-2xl p-5 border border-border/40 shadow-sm">
              <h2 className="text-foreground font-bold text-sm mb-3 flex items-center gap-2">
                <i className="fas fa-car text-primary" aria-hidden="true" />
                Gasto por veículo
              </h2>
              <div style={{ width: '100%', height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vehicleData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickFormatter={(v) => `€${v}`} tickLine={false} axisLine={false} />
                  <Tooltip content={<SpendTooltip />} />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    {vehicleData.map((entry, i) => (
                      <Cell key={`bar-cell-${entry.name}-${i}`} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Histórico */}
          <h2 className="text-foreground font-bold mb-3" style={{ fontSize: '1rem' }}>Histórico de Estacionamento</h2>
          <div className="rounded-2xl border border-border/40 overflow-hidden mb-6 bg-card shadow-sm">
            {filtered
              .slice()
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((expense, idx) => {
                const hasEV = !!expense.evCharging;
                const totalAmount = expense.amount + (expense.evCharging?.chargingAmount ?? 0);
                return (
                  <div key={expense.id} className={`px-4 py-3.5 ${idx < filtered.length - 1 ? 'border-b border-border/40' : ''}`}>
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
                            {hasEV && (
                              <>
                                <span className="text-muted-foreground/30">•</span>
                                <span className="flex items-center gap-1 text-success text-xs font-semibold">
                                  <i className="fas fa-bolt" aria-hidden="true" />
                                  {expense.evCharging!.kWh} kWh · {expense.evCharging!.chargerType}
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
                          <span className="text-muted-foreground font-medium text-[0.6rem] block">
                            Park €{expense.amount.toFixed(2)} + EV €{expense.evCharging!.chargingAmount.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground font-medium uppercase text-[0.6rem]">Via RFID</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Notas de faturação */}
          <div className="rounded-xl p-4 flex items-start gap-3 bg-primary/5 border border-primary/20 mb-4">
            <i className="fas fa-circle-info mt-0.5 text-primary" aria-hidden="true" />
            <div className="leading-relaxed text-xs">
              <p className="font-bold mb-1 text-foreground">Faturação Automática</p>
              <p className="text-muted-foreground">
                As suas despesas são processadas automaticamente à saída através do sistema OCR/RFID.
                As faturas são enviadas para o seu email registado.
              </p>
            </div>
          </div>
          <div className="rounded-xl p-4 flex items-start gap-3 bg-success/5 border border-success/20">
            <i className="fas fa-charging-station mt-0.5 text-success" aria-hidden="true" />
            <div className="leading-relaxed text-xs">
              <p className="font-bold mb-1 text-foreground">Carregamento de Veículos Elétricos</p>
              <p className="text-muted-foreground">
                O custo de carregamento EV é faturado separadamente com base nos kWh consumidos.
                A sessão de carregamento é registada automaticamente via RFID e aparece discriminada na fatura.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          ABA: PLANEAMENTO
      ════════════════════════════════════════════════════════════ */}
      {activeTab === 'planeamento' && (
        <div className="animate-in fade-in duration-200">

          {/* Filtro de cidade */}
          <div className="bg-card rounded-2xl border border-border/40 shadow-sm p-4 mb-4">
            <p className="text-foreground font-semibold mb-2" style={{ fontSize: '0.8rem' }}>
              <i className="fas fa-city text-primary mr-1.5" aria-hidden="true" />
              Cidade
            </p>
            <select
              value={selectedCity ?? ''}
              onChange={(e) => setSelectedCity(e.target.value || null)}
              aria-label="Filtrar por cidade"
              className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Todas as cidades</option>
              {availableCities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          {/* Painel de filtros */}
          <div className="bg-card rounded-2xl border border-border/40 shadow-sm p-4 mb-5">

            {/* Duração */}
            <p className="text-foreground font-semibold mb-2" style={{ fontSize: '0.8rem' }}>
              <i className="fas fa-clock text-primary mr-1.5" aria-hidden="true" />
              Duração estimada
            </p>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
                <input
                  type="number" min={0} max={23} value={durationHours}
                  onChange={(e) => setDurationHours(Math.min(23, Math.max(0, Number(e.target.value))))}
                  className="w-12 bg-transparent text-center text-base font-bold text-foreground focus:outline-none"
                  aria-label="Horas"
                />
                <span className="text-xs text-muted-foreground font-semibold">h</span>
              </div>
              <span className="text-muted-foreground font-bold">:</span>
              <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
                <input
                  type="number" min={0} max={59} step={5} value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Math.min(59, Math.max(0, Number(e.target.value))))}
                  className="w-12 bg-transparent text-center text-base font-bold text-foreground focus:outline-none"
                  aria-label="Minutos"
                />
                <span className="text-xs text-muted-foreground font-semibold">min</span>
              </div>
            </div>

            <div className="border-t border-border/40 mb-4" />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-muted-foreground mb-2" style={{ fontSize: '0.75rem' }}>
                  <i className="fas fa-sliders mr-1.5" aria-hidden="true" />Filtros
                </p>
                <div className="flex flex-wrap gap-2">
                  <Chip active={filterEV}         icon="fa-charging-station" label="Carregador EV"
                    onClick={() => setFilterEV((v) => !v)}
                    ariaLabel={filterEV ? 'Remover filtro EV' : 'Filtrar com carregador EV'} />
                  <Chip active={filterAccessible} icon="fa-wheelchair"       label="Acessível"
                    onClick={() => setFilterAccessible((v) => !v)}
                    ariaLabel={filterAccessible ? 'Remover filtro acessível' : 'Filtrar lugares acessíveis'} />
                  {activeFilters > 0 && (
                    <button
                      onClick={() => { setFilterEV(false); setFilterAccessible(false); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed border-error/60 text-error hover:bg-error/5 transition-all"
                      style={{ fontSize: '0.75rem' }} aria-label="Limpar filtros"
                    >
                      <i className="fas fa-xmark" aria-hidden="true" />
                      Limpar ({activeFilters})
                    </button>
                  )}
                </div>
              </div>

              <div>
                <p className="text-muted-foreground mb-2" style={{ fontSize: '0.75rem' }}>
                  <i className="fas fa-arrow-up-wide-short mr-1.5" aria-hidden="true" />Ordenar por
                </p>
                <div className="flex flex-wrap gap-2">
                  <Chip active={sortBy === 'ratio'}    label="Melhor relação"   icon="fa-arrow-trend-up"  onClick={() => setSortBy('ratio')}    />
                  <Chip active={sortBy === 'price'}    label="Preço mais baixo" icon="fa-euro-sign"       onClick={() => setSortBy('price')}    />
                  <Chip active={sortBy === 'distance'} label="Mais próximo"     icon="fa-location-dot"   onClick={() => setSortBy('distance')} />
                </div>
              </div>
            </div>

            <div className="border-t border-border/40 mt-4 mb-3" />

            <div className="flex items-center justify-between mb-1.5">
              <p className="text-foreground font-semibold" style={{ fontSize: '0.8rem' }}>
                <i className="fas fa-location-dot text-primary mr-1.5" aria-hidden="true" />Distância máxima
              </p>
              <span className="text-primary font-bold" style={{ fontSize: '0.8rem' }}>{maxDistance} km</span>
            </div>
            <input
              type="range" min={1} max={10} step={1} value={maxDistance}
              onChange={(e) => setMaxDistance(Number(e.target.value))}
              className="w-full accent-primary h-1.5 rounded-full cursor-pointer"
              aria-label={`Distância máxima: ${maxDistance} km`}
            />
            <div className="flex justify-between text-muted-foreground mt-1" style={{ fontSize: '0.65rem' }}>
              <span>1 km</span><span>5 km</span><span>10 km</span>
            </div>
          </div>

          {/* Resultados */}
          {processedParks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl py-16 px-6 text-center bg-card border-2 border-dashed border-border">
              <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mb-3">
                <i className="fas fa-triangle-exclamation text-warning" style={{ fontSize: '1.5rem' }} aria-hidden="true" />
              </div>
              <p className="text-foreground font-bold mb-1" style={{ fontSize: '1rem' }}>Nenhum parque encontrado</p>
              <p className="text-muted-foreground" style={{ fontSize: '0.875rem' }}>Tente ajustar os filtros ou aumentar a distância máxima.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {processedParks.map((park, index) => {
                const isExpanded = expandedPark === park.id;
                const occupancyPct = Math.round(((park.totalSpots - park.availableSpots) / park.totalSpots) * 100);
                const isFull = park.availableSpots === 0;
                const isLow  = park.availableSpots > 0 && park.availableSpots <= Math.ceil(park.totalSpots * 0.2);
                const statusCfg = isFull
                  ? { bg: 'bg-error/10',   text: 'text-error',   label: 'Lotado'      }
                  : isLow
                  ? { bg: 'bg-warning/10', text: 'text-warning', label: 'Quase cheio' }
                  : { bg: 'bg-success/10', text: 'text-success', label: 'Disponível'  };

                return (
                  <article
                    key={park.id}
                    className="bg-card rounded-2xl border border-border/40 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/20"
                    aria-label={`Parque ${park.name}`}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                            <span className={`px-2 py-0.5 rounded-full text-[0.65rem] font-bold uppercase ${statusCfg.bg} ${statusCfg.text}`}>
                              {statusCfg.label}
                            </span>
                            {index === 0 && sortBy === 'ratio' && (
                              <span className="px-2 py-0.5 rounded-full text-[0.65rem] font-bold uppercase bg-primary/10 text-primary">
                                <i className="fas fa-trophy mr-1" aria-hidden="true" />Melhor opção
                              </span>
                            )}
                            {park.hasEVCharger && (
                              <span className="px-2 py-0.5 rounded-full text-[0.65rem] font-bold uppercase bg-warning/10 text-warning">
                                <i className="fas fa-bolt mr-1" aria-hidden="true" />EV
                              </span>
                            )}
                            {park.hasAccessible && (
                              <span className="px-2 py-0.5 rounded-full text-[0.65rem] font-bold uppercase bg-info/10 text-info">
                                <i className="fas fa-wheelchair mr-1" aria-hidden="true" />Acessível
                              </span>
                            )}
                            {park.is24h && (
                              <span className="px-2 py-0.5 rounded-full text-[0.65rem] font-bold uppercase bg-primary/10 text-primary">
                                <i className="fas fa-clock mr-1" aria-hidden="true" />24h
                              </span>
                            )}
                          </div>
                          <h2 className="text-foreground font-bold leading-tight line-clamp-1" style={{ fontSize: '1rem' }}>{park.name}</h2>
                          <p className="text-muted-foreground flex items-center gap-1 mt-0.5 line-clamp-1" style={{ fontSize: '0.78rem' }}>
                            <i className="fas fa-location-dot" aria-hidden="true" />{park.address}
                          </p>
                        </div>

                        <div className="flex gap-3 shrink-0">
                          <div className="text-center">
                            <p className="text-muted-foreground uppercase tracking-wide" style={{ fontSize: '0.6rem' }}>Custo</p>
                            <p className="text-primary font-extrabold" style={{ fontSize: '1.1rem', lineHeight: 1 }}>€{park.estimatedCost.toFixed(2)}</p>
                            <p className="text-muted-foreground" style={{ fontSize: '0.6rem' }}>{durationHours}h{durationMinutes > 0 ? `${durationMinutes}m` : ''}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-muted-foreground uppercase tracking-wide" style={{ fontSize: '0.6rem' }}>Distância</p>
                            <p className="text-foreground font-extrabold" style={{ fontSize: '1.1rem', lineHeight: 1 }}>{park.distance}</p>
                            <p className="text-muted-foreground" style={{ fontSize: '0.6rem' }}>{park.walkingTime} a pé</p>
                          </div>
                        </div>
                      </div>

                      {/* Tarifas */}
                      <div className="mt-3 pt-3 border-t border-border/40 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { label: 'Horária',      value: `€${park.hourlyRate.toFixed(2)}/h` },
                          { label: 'Máx. diário',  value: `€${park.dailyMax.toFixed(2)}` },
                          { label: 'Mensalidade',  value: `€${park.monthlyRate.toFixed(2)}` },
                          { label: 'Disponíveis',  value: `${park.availableSpots}/${park.totalSpots}`,
                            valueClass: park.availableSpots > 20 ? 'text-success' : park.availableSpots > 5 ? 'text-warning' : 'text-error' },
                        ].map((item) => (
                          <div key={item.label} className="flex flex-col">
                            <span className="text-muted-foreground" style={{ fontSize: '0.68rem' }}>{item.label}</span>
                            <span className={`font-semibold ${item.valueClass ?? 'text-foreground'}`} style={{ fontSize: '0.8rem' }}>{item.value}</span>
                          </div>
                        ))}
                      </div>

                      {/* Barra de ocupação */}
                      <div className="mt-3">
                        <div className="flex justify-between text-muted-foreground mb-1" style={{ fontSize: '0.68rem' }}>
                          <span>Ocupação atual</span><span>{occupancyPct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              occupancyPct >= 90 ? 'bg-error' : occupancyPct >= 70 ? 'bg-warning' : 'bg-success'
                            }`}
                            style={{ width: `${occupancyPct}%` }}
                            role="progressbar" aria-valuenow={occupancyPct} aria-valuemin={0} aria-valuemax={100}
                            aria-label={`Ocupação: ${occupancyPct}%`}
                          />
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <button
                          onClick={() => setExpandedPark(isExpanded ? null : park.id)}
                          className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                          style={{ fontSize: '0.78rem' }} aria-expanded={isExpanded}
                        >
                          <i className="fas fa-chart-line" aria-hidden="true" style={{ fontSize: '0.75rem' }} />
                          {isExpanded ? 'Ocultar previsão' : 'Ver previsão de ocupação'}
                          <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`} aria-hidden="true" style={{ fontSize: '0.65rem' }} />
                        </button>
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/parque/${park.id}`)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all font-medium"
                            style={{ fontSize: '0.78rem' }} aria-label={`Ver detalhes de ${park.name}`}
                          >
                            <i className="fas fa-circle-info" aria-hidden="true" style={{ fontSize: '0.7rem' }} />Detalhes
                          </button>
                          {park.availableSpots > 0 && (
                            <button
                              onClick={() => navigate(`/reserva?parkId=${park.id}`)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary text-primary hover:bg-primary hover:text-white transition-all font-medium"
                              style={{ fontSize: '0.78rem' }} aria-label={`Reservar lugar em ${park.name}`}
                            >
                              <i className="fas fa-bookmark" aria-hidden="true" style={{ fontSize: '0.7rem' }} />Reservar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Gráfico de previsão */}
                    {isExpanded && (
                      <div className="border-t border-border/40 px-4 pb-4 pt-3 bg-muted/30">
                        <p className="text-foreground font-semibold mb-3" style={{ fontSize: '0.8rem' }}>
                          <i className="fas fa-calendar text-primary mr-1.5" aria-hidden="true" />
                          Previsão de ocupação — próximas 12 horas
                        </p>
                        <div style={{ width: '100%', height: 180 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={park.occupancyForecast} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} />
                            <XAxis dataKey="hour" style={{ fontSize: '0.62rem' }} tick={{ fill: 'var(--color-muted-foreground)' }} />
                            <YAxis domain={[0, 100]} style={{ fontSize: '0.62rem' }} tick={{ fill: 'var(--color-muted-foreground)' }} tickFormatter={(v) => `${v}%`} />
                            <Tooltip content={<OccupancyTooltip />} />
                            <Line type="monotone" dataKey="occupancy" stroke="#7357ec" strokeWidth={2}
                              dot={{ fill: '#7357ec', r: 2.5 }} activeDot={{ r: 4 }} name="Ocupação prevista" />
                          </LineChart>
                        </ResponsiveContainer>
                        </div>
                        {park.availableSpots < 10 && (
                          <div className="flex items-start gap-2 mt-3 rounded-xl p-3 bg-warning/10 border border-warning/20">
                            <i className="fas fa-triangle-exclamation text-warning mt-0.5 flex-shrink-0" style={{ fontSize: '0.8rem' }} aria-hidden="true" />
                            <p className="text-foreground" style={{ fontSize: '0.78rem' }}>
                              Poucos lugares disponíveis. <strong>Recomendamos reservar com antecedência.</strong>
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {/* Nota informativa */}
          <div className="flex items-start gap-3 rounded-xl p-4 mt-5 bg-card border border-border" role="note">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <i className="fas fa-circle-info text-primary" style={{ fontSize: '0.85rem' }} aria-hidden="true" />
            </div>
            <div>
              <p className="text-foreground font-bold mb-0.5" style={{ fontSize: '0.8rem' }}>Informação sobre reservas</p>
              <p className="text-muted-foreground leading-relaxed" style={{ fontSize: '0.78rem' }}>
                As reservas são válidas por 30 minutos após confirmação. O veículo é identificado automaticamente
                na entrada (Via Verde RFID ou OCR de matrícula) e o pagamento processado pelo método definido no perfil.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}