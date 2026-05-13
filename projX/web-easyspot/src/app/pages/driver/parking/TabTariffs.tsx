import { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import type { ParkingLot } from '../../../data/parkingTypes';
import { API_BASE } from '../../../../services/apiBase';
import { getAccessToken } from '../../../services/authToken';

interface HourlyPoint {
  hour: string;
  occupancyPercent: number;
}

interface OccupancyTooltipProps {
  readonly active?: boolean;
  readonly payload?: { readonly value: number }[];
  readonly label?: string;
}

function OccupancyTooltip({ active, payload, label }: OccupancyTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border/40 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-muted-foreground text-xs mb-0.5">{label}</p>
      <p className="text-primary font-bold text-sm">{payload[0].value}%</p>
    </div>
  );
}

export function TabTariffs({ lot }: Readonly<{ lot: ParkingLot }>) {
  const [hourlyData, setHourlyData] = useState<HourlyPoint[]>([]);
  const [loadingChart, setLoadingChart] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    fetch(`${API_BASE}/api/parks/${lot.id}/occupancy/hourly`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then((r) => r.ok ? r.json() as Promise<HourlyPoint[]> : Promise.resolve([]))
      .then(setHourlyData)
      .catch(() => setHourlyData([]))
      .finally(() => setLoadingChart(false));
  }, [lot.id]);

  const evKwhPrice = lot.evChargers.find((c) => c.price > 0)?.price ?? null;

  return (
    <div className="animate-in fade-in duration-200 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center p-3 rounded-xl bg-primary text-primary-foreground shadow-sm">
            <div>
              <p className="font-bold text-sm">Por Hora</p>
              <p className="opacity-80 text-xs">Fração de 15 min</p>
            </div>
            <p className="font-black text-xl">€{lot.hourlyRate.toFixed(2)}</p>
          </div>
          <div className="flex justify-between items-center p-3 rounded-xl bg-card border border-border">
            <div>
              <p className="font-bold text-sm text-foreground">Máx. Diário</p>
              <p className="text-muted-foreground text-xs">Limite 24h</p>
            </div>
            <p className="font-bold text-sm text-foreground">
              {lot.dailyMax > 0 ? `€${lot.dailyMax.toFixed(2)}` : 'N/D'}
            </p>
          </div>
          <div className="flex justify-between items-center p-3 rounded-xl bg-card border border-border">
            <div>
              <p className="font-bold text-sm text-foreground">Passe Mensal</p>
              <p className="text-muted-foreground text-xs">Acesso 24/7</p>
            </div>
            <p className="font-bold text-sm text-foreground">
              {lot.monthlyRate > 0 ? `€${lot.monthlyRate.toFixed(2)}` : 'N/D'}
            </p>
          </div>
          {evKwhPrice !== null && (
            <div className="flex justify-between items-center p-3 rounded-xl bg-card border border-border">
              <div>
                <p className="font-bold text-sm text-foreground">Carregamento EV</p>
                <p className="text-muted-foreground text-xs">Por kWh</p>
              </div>
              <p className="font-bold text-sm text-foreground">€{evKwhPrice.toFixed(2)}/kWh</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border/40 p-4">
        <p className="text-foreground font-semibold mb-3" style={{ fontSize: '0.8rem' }}>
          <i className="fas fa-chart-area text-primary mr-1.5" aria-hidden="true" />
          Tendência de ocupação — média últimos 7 dias
        </p>
        {loadingChart ? (
          <div className="h-36 flex items-center justify-center text-muted-foreground text-sm">
            A carregar dados...
          </div>
        ) : hourlyData.length === 0 ? (
          <div className="h-36 flex items-center justify-center text-muted-foreground text-sm">
            Sem dados históricos disponíveis
          </div>
        ) : (
          <div style={{ width: '100%', height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="occGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7357ec" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7357ec" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} />
                <XAxis dataKey="hour" style={{ fontSize: '0.6rem' }} tick={{ fill: 'var(--color-muted-foreground)' }} interval={3} />
                <YAxis domain={[0, 100]} style={{ fontSize: '0.6rem' }} tick={{ fill: 'var(--color-muted-foreground)' }} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={<OccupancyTooltip />} />
                <Area
                  type="monotone"
                  dataKey="occupancyPercent"
                  stroke="#7357ec"
                  strokeWidth={2}
                  fill="url(#occGradient)"
                  dot={false}
                  activeDot={{ r: 4 }}
                  name="Ocupação média"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="text-muted-foreground mt-2" style={{ fontSize: '0.68rem' }}>
          <i className="fas fa-circle-info mr-1" aria-hidden="true" />
          Dados baseados na média histórica das últimas 168 horas. Ajuda a escolher o melhor horário de visita.
        </p>
      </div>
    </div>
  );
}
