import { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import { COLORS } from './costsHelpers';
import { fetchDriverSpending, type DriverSpendingResponse, type SpendingTimeWindow } from '../../../services/costsApi';
import { useProfile } from '../../../context/ProfileContext';

const PERIODS: { id: SpendingTimeWindow; label: string }[] = [
  { id: '7D', label: '7 dias' }, { id: '30D', label: '30 dias' }, { id: '3M', label: '3 meses' },
];

interface SpendTooltipProps {
  readonly active?: boolean;
  readonly payload?: readonly { readonly value: number }[];
  readonly label?: string;
}

function SpendTooltip({ active, payload, label }: SpendTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border/40 rounded-xl px-3 py-2 shadow-xl text-sm">
      <p className="text-muted-foreground text-xs mb-0.5">{label}</p>
      <p className="font-bold text-primary">€{payload[0].value.toFixed(2)}</p>
    </div>
  );
}

export function ExpensesTab() {
  const { vehicles } = useProfile();
  const [period, setPeriod] = useState<SpendingTimeWindow>('30D');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [data, setData] = useState<DriverSpendingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const resp = await fetchDriverSpending({
          timeWindow: period,
          vehicleId: selectedVehicleId,
        });
        if (mounted) setData(resp);
      } catch (err) {
        if (mounted) setError('Não foi possível carregar os seus gastos.');
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [period, selectedVehicleId]);

  const chartData = useMemo(() => {
    if (!data?.timeseries) return [];
    return data.timeseries.map(p => ({
      date: new Date(p.date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }),
      total: p.totalSpent
    }));
  }, [data]);

  const pieData = useMemo(() => {
    if (!data?.breakdownByPark) return [];
    return data.breakdownByPark.map(b => ({ name: b.name, value: b.totalSpent }));
  }, [data]);

  const vehicleData = useMemo(() => {
    if (!data?.breakdownByVehicle) return [];
    return data.breakdownByVehicle.map(b => ({ name: b.name, total: b.totalSpent }));
  }, [data]);

  if (loading && !data) {
    return <div className="py-20 text-center text-muted-foreground">A carregar os seus gastos...</div>;
  }

  if (error && !data) {
    return (
      <div className="py-20 text-center">
        <p className="text-error font-bold">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 text-primary hover:underline">Tentar novamente</button>
      </div>
    );
  }

  if (!data) return null;

  const { totals, insights, history } = data;

  return (
    <div className="animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-semibold flex-shrink-0" style={{ fontSize: '0.78rem' }}>
            <i className="fas fa-car mr-1 text-primary/70" />Veículo
          </span>
          <div className="relative flex items-center">
            <select
              value={selectedVehicleId ?? ''}
              onChange={(e) => setSelectedVehicleId(e.target.value || null)}
              aria-label="Filtrar por veículo"
              className="rounded-xl border border-border bg-card text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all appearance-none pl-3 pr-7"
              style={{ fontSize: '0.82rem', paddingTop: '0.4rem', paddingBottom: '0.4rem' }}
            >
              <option value="">Todos</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate} ({v.model})</option>)}
            </select>
            <i className="fas fa-chevron-down text-muted-foreground pointer-events-none absolute right-2.5" style={{ fontSize: '0.6rem' }} />
          </div>
        </div>
        <div className="flex gap-1 p-1 bg-muted rounded-xl">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                period === p.id ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total gasto',      value: `€${totals.totalSpent.toFixed(2)}`,    icon: 'fa-wallet',         color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Média/sessão',     value: `€${totals.avgPerSession.toFixed(2)}`, icon: 'fa-chart-line',     color: 'text-success', bg: 'bg-success/10' },
          { label: 'Mais frequente',   value: insights.mostUsedPark || '—',          icon: 'fa-map-pin',        color: 'text-warning', bg: 'bg-warning/10' },
          { label: 'Sessão mais cara', value: insights.costliestSession ? `€${insights.costliestSession.totalSpent.toFixed(2)}` : '—', icon: 'fa-arrow-trend-up', color: 'text-error',   bg: 'bg-error/10'   },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-card rounded-2xl p-4 border border-border/40 shadow-sm">
            <div className={`w-9 h-9 rounded-xl ${kpi.bg} flex items-center justify-center mb-2.5`}>
              <i className={`fas ${kpi.icon} ${kpi.color} text-sm`} aria-hidden="true" />
            </div>
            <p className="text-foreground font-extrabold text-lg leading-none truncate" title={kpi.value}>{kpi.value}</p>
            <p className="text-muted-foreground text-xs mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {(totals.chargingSpent > 0) && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { icon: 'fa-square-parking', label: 'Estacionamento',    value: totals.parkingSpent },
            { icon: 'fa-charging-station', label: 'Carregamento EV', value: totals.chargingSpent },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl p-4 border border-border/40 bg-card shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <i className={`fas ${item.icon} text-primary text-base`} aria-hidden="true" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{item.label}</p>
                <p className="text-foreground font-extrabold text-base">€{item.value.toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {chartData.length > 0 && (
        <div className="bg-card rounded-2xl p-5 border border-border/40 shadow-sm mb-4">
          <h2 className="text-foreground font-bold text-sm mb-4 flex items-center gap-2">
            <i className="fas fa-chart-area text-primary" aria-hidden="true" />Gastos ao longo do tempo
          </h2>
          <div style={{ width: '100%', height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#7357ec" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7357ec" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  interval={period === '7D' ? 0 : period === '30D' ? 5 : 14}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickFormatter={(v) => `€${v}`} tickLine={false} axisLine={false} />
                <Tooltip content={<SpendTooltip />} />
                <Area type="monotone" dataKey="total" stroke="#7357ec" strokeWidth={2.5}
                  fill="url(#colorTotal)" dot={false}
                  activeDot={{ r: 5, fill: '#7357ec', strokeWidth: 2, stroke: 'white' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {pieData.length > 0 && (
          <div className="bg-card rounded-2xl p-5 border border-border/40 shadow-sm">
            <h2 className="text-foreground font-bold text-sm mb-3 flex items-center gap-2">
              <i className="fas fa-chart-pie text-primary" aria-hidden="true" />Gasto por parque
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
            <div className="mt-3 space-y-1.5 overflow-hidden">
              {pieData.slice(0, 5).map((entry, i) => (
                <div key={entry.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-foreground/70 text-xs truncate">{entry.name}</span>
                  </div>
                  <span className="text-foreground font-bold text-xs flex-shrink-0">€{entry.value.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {vehicleData.length > 0 && (
          <div className="bg-card rounded-2xl p-5 border border-border/40 shadow-sm">
            <h2 className="text-foreground font-bold text-sm mb-3 flex items-center gap-2">
              <i className="fas fa-car text-primary" aria-hidden="true" />Gasto por veículo
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
        )}
      </div>

      <h2 className="text-foreground font-bold mb-3" style={{ fontSize: '1rem' }}>Histórico de Estacionamento</h2>
      <div className="rounded-2xl border border-border/40 overflow-hidden mb-6 bg-card shadow-sm">
        {history.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">Sem histórico para este período.</div>
        ) : (
          history.map((expense, idx) => {
            return (
              <div key={`${expense.date}-${idx}`} className={`px-4 py-3.5 ${idx < history.length - 1 ? 'border-b border-border/40' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-primary/10">
                      <i className="fas fa-receipt text-primary text-xs" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-foreground font-semibold text-sm truncate">{expense.parkName}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-muted-foreground text-xs whitespace-nowrap">
                          {new Date(expense.date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </span>
                        <span className="text-muted-foreground/30">•</span>
                        <span className="text-muted-foreground text-xs whitespace-nowrap">
                          {Math.floor(expense.durationMinutes / 60)}h{expense.durationMinutes % 60}m
                        </span>
                        {expense.vehicle && (
                          <>
                            <span className="text-muted-foreground/30">•</span>
                            <span className="flex items-center gap-1 text-muted-foreground text-xs truncate">
                              <i className="fas fa-car" aria-hidden="true" style={{fontSize: '0.65rem'}} />{expense.vehicle}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="font-extrabold text-sm" style={{ color: 'var(--color-primary-purple)' }}>
                      €{expense.totalSpent.toFixed(2)}
                    </p>
                    <span className="text-muted-foreground font-medium uppercase text-[0.6rem]">{expense.status}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

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
    </div>
  );
}
