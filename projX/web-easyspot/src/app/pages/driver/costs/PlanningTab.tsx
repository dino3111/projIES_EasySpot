import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { mockParkingLots } from '../../../data/parkingData';
import { useProfile } from '../../../context/ProfileContext';
import { VehiclePicker } from '../../../components/shared/VehiclePicker';
import { calculateCost, generateOccupancyForecast, type SortBy, type ParkingWithCost } from './costsHelpers';

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

interface ChipProps {
  readonly active: boolean;
  readonly icon?: string;
  readonly label: string;
  readonly onClick: () => void;
  readonly ariaLabel?: string;
}

function Chip({ active, icon, label, onClick, ariaLabel }: ChipProps) {
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

export function PlanningTab() {
  const navigate = useNavigate();
  const { vehicles } = useProfile();
  const primaryVehicle = vehicles.find((v) => v.isPrimary) ?? vehicles[0] ?? null;

  const [planVehicleId, setPlanVehicleId]       = useState<string | null>(primaryVehicle?.id ?? null);
  const [durationHours, setDurationHours]       = useState(2);
  const [durationMinutes, setDurationMinutes]   = useState(0);
  const [selectedCity, setSelectedCity]         = useState<string | null>(null);
  const [filterEV, setFilterEV]                 = useState(primaryVehicle?.isEV ?? false);
  const [filterAccessible, setFilterAccessible] = useState(primaryVehicle?.isAccessible ?? false);
  const [maxDistance, setMaxDistance]           = useState(5);
  const [sortBy, setSortBy]                     = useState<SortBy>('ratio');
  const [expandedPark, setExpandedPark]         = useState<string | null>(null);

  useEffect(() => {
    const v = vehicles.find((v) => v.id === planVehicleId) ?? null;
    setFilterEV(v?.isEV ?? false);
    setFilterAccessible(v?.isAccessible ?? false);
  }, [planVehicleId, vehicles]);

  const availableCities = useMemo(
    () => [...new Set(mockParkingLots.map((lot) => lot.localidade))].sort((a, b) => a.localeCompare(b)),
    [],
  );

  const processedParks = useMemo<ParkingWithCost[]>(() => {
    const lots = mockParkingLots.filter((lot) => {
      if (selectedCity && lot.localidade !== selectedCity) return false;
      if (filterEV && !lot.hasEVCharger) return false;
      if (filterAccessible && !lot.hasAccessible) return false;
      const distKm = Number.parseFloat(lot.distance.replace(' km', '').replace(',', '.'));
      if (distKm > maxDistance) return false;
      return true;
    });
    const totalMinutes = durationHours * 60 + durationMinutes;
    const withCosts: ParkingWithCost[] = lots.map((lot) => {
      const cost = calculateCost(lot, totalMinutes);
      const distKm = Number.parseFloat(lot.distance.replace(' km', '').replace(',', '.'));
      return { ...lot, estimatedCost: cost, costPerKm: cost / distKm, occupancyForecast: generateOccupancyForecast(lot) };
    });
    withCosts.sort((a, b) => {
      if (sortBy === 'price') return a.estimatedCost - b.estimatedCost;
      if (sortBy === 'distance') {
        return Number.parseFloat(a.distance.replace(' km', '').replace(',', '.')) -
               Number.parseFloat(b.distance.replace(' km', '').replace(',', '.'));
      }
      return a.costPerKm - b.costPerKm;
    });
    return withCosts;
  }, [durationHours, durationMinutes, selectedCity, filterEV, filterAccessible, maxDistance, sortBy]);

  const activeFilters = [filterEV, filterAccessible].filter(Boolean).length;

  return (
    <div className="animate-in fade-in duration-200">
      {vehicles.length > 0 && (
        <div className="bg-card rounded-2xl border border-border/40 shadow-sm p-4 mb-4">
          <VehiclePicker
            vehicles={vehicles}
            selectedId={planVehicleId}
            onSelect={setPlanVehicleId}
            allLabel="Sem veículo selecionado"
            className="w-full"
          />
          {planVehicleId && (
            <p className="text-muted-foreground mt-2" style={{ fontSize: '0.72rem' }}>
              <i className="fas fa-circle-info mr-1" aria-hidden="true" />{' '}
              Os filtros EV e Acessível foram ajustados automaticamente.
            </p>
          )}
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border/40 shadow-sm p-4 mb-4">
        <p className="text-foreground font-semibold mb-2" style={{ fontSize: '0.8rem' }}>
          <i className="fas fa-city text-primary mr-1.5" aria-hidden="true" />{' '}
          Cidade
        </p>
        <select
          value={selectedCity ?? ''}
          onChange={(e) => setSelectedCity(e.target.value || null)}
          aria-label="Filtrar por cidade"
          className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Todas as cidades</option>
          {availableCities.map((city) => <option key={city} value={city}>{city}</option>)}
        </select>
      </div>

      <div className="bg-card rounded-2xl border border-border/40 shadow-sm p-4 mb-5">
        <p className="text-foreground font-semibold mb-2" style={{ fontSize: '0.8rem' }}>
          <i className="fas fa-clock text-primary mr-1.5" aria-hidden="true" />{' '}
          Duração estimada
        </p>
        <div className="flex items-center gap-3 mb-4">
          {[
            { value: durationHours, setter: setDurationHours, max: 23, label: 'Horas', unit: 'h' },
            { value: durationMinutes, setter: setDurationMinutes, max: 59, label: 'Minutos', unit: 'min', step: 5 },
          ].map(({ value, setter, max, label, unit, step }) => (
            <div key={unit} className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
              <input
                type="number" min={0} max={max} step={step ?? 1} value={value}
                onChange={(e) => { const v = Number(e.target.value); setter(Math.min(max, Math.max(0, Number.isNaN(v) ? 0 : v))); }}
                className="w-12 bg-transparent text-center text-base font-bold text-foreground focus:outline-none"
                aria-label={label}
              />
              <span className="text-xs text-muted-foreground font-semibold">{unit}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-border/40 mb-4" />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-muted-foreground mb-2" style={{ fontSize: '0.75rem' }}>
              <i className="fas fa-sliders mr-1.5" aria-hidden="true" />{' '}
              Filtros
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
                  <i className="fas fa-xmark" aria-hidden="true" />{' '}
                  Limpar ({activeFilters})
                </button>
              )}
            </div>
          </div>

          <div>
            <p className="text-muted-foreground mb-2" style={{ fontSize: '0.75rem' }}>
              <i className="fas fa-arrow-up-wide-short mr-1.5" aria-hidden="true" />{' '}
              Ordenar por
            </p>
            <div className="flex flex-wrap gap-2">
              <Chip active={sortBy === 'ratio'}    label="Melhor relação"   icon="fa-arrow-trend-up" onClick={() => setSortBy('ratio')}    />
              <Chip active={sortBy === 'price'}    label="Preço mais baixo" icon="fa-euro-sign"      onClick={() => setSortBy('price')}    />
              <Chip active={sortBy === 'distance'} label="Mais próximo"     icon="fa-location-dot"  onClick={() => setSortBy('distance')} />
            </div>
          </div>
        </div>

        <div className="border-t border-border/40 mt-4 mb-3" />

        <div className="flex items-center justify-between mb-1.5">
          <p className="text-foreground font-semibold" style={{ fontSize: '0.8rem' }}>
            <i className="fas fa-location-dot text-primary mr-1.5" aria-hidden="true" />{' '}
            Distância máxima
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
            let statusCfg = { bg: 'bg-success/10', text: 'text-success', label: 'Disponível' };
            if (isFull) {
              statusCfg = { bg: 'bg-error/10', text: 'text-error', label: 'Lotado' };
            } else if (isLow) {
              statusCfg = { bg: 'bg-warning/10', text: 'text-warning', label: 'Quase cheio' };
            }

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
                            <i className="fas fa-trophy mr-1" aria-hidden="true" />{' '}
                            Melhor opção
                          </span>
                        )}
                        {park.hasEVCharger && (
                          <span className="px-2 py-0.5 rounded-full text-[0.65rem] font-bold uppercase bg-warning/10 text-warning">
                            <i className="fas fa-bolt mr-1" aria-hidden="true" />{' '}
                            EV
                          </span>
                        )}
                        {park.hasAccessible && (
                          <span className="px-2 py-0.5 rounded-full text-[0.65rem] font-bold uppercase bg-info/10 text-info">
                          <i className="fas fa-wheelchair mr-1" aria-hidden="true" />{' '}
                          Acessível
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

                  <div className="mt-3 pt-3 border-t border-border/40 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: 'Horária',     value: `€${park.hourlyRate.toFixed(2)}/h` },
                      { label: 'Máx. diário', value: `€${park.dailyMax.toFixed(2)}` },
                      { label: 'Mensalidade', value: `€${park.monthlyRate.toFixed(2)}` },
                      { label: 'Disponíveis', value: `${park.availableSpots}/${park.totalSpots}`,
                        valueClass:
                          park.availableSpots > 20
                            ? 'text-success'
                            : park.availableSpots > 5
                              ? 'text-warning'
                              : 'text-error',
                      },
                    ].map((item) => (
                      <div key={item.label} className="flex flex-col">
                        <span className="text-muted-foreground" style={{ fontSize: '0.68rem' }}>{item.label}</span>
                        <span className={`font-semibold ${item.valueClass ?? 'text-foreground'}`} style={{ fontSize: '0.8rem' }}>{item.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-between text-muted-foreground mb-1" style={{ fontSize: '0.68rem' }}>
                      <span>Ocupação atual</span><span>{occupancyPct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <progress
                        className={`h-full rounded-full transition-all duration-500 ${
                          occupancyPct >= 90 ? 'bg-error' : occupancyPct >= 70 ? 'bg-warning' : 'bg-success'
                        }`}
                        style={{ width: `${occupancyPct}%` }}
                        value={occupancyPct}
                        max={100}
                        aria-label={`Ocupação: ${occupancyPct}%`}
                      />
                    </div>
                  </div>

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
                        onClick={() => navigate(`/parking/${park.id}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all font-medium"
                        style={{ fontSize: '0.78rem' }} aria-label={`Ver detalhes de ${park.name}`}
                      >
                        <i className="fas fa-circle-info" aria-hidden="true" style={{ fontSize: '0.7rem' }} />{' '}
                        Detalhes
                      </button>
                      {park.availableSpots > 0 && (
                        <button
                          onClick={() => navigate(`/reservation?parkId=${park.id}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary text-primary hover:bg-primary hover:text-white transition-all font-medium"
                          style={{ fontSize: '0.78rem' }} aria-label={`Reservar lugar em ${park.name}`}
                        >
                          <i className="fas fa-bookmark" aria-hidden="true" style={{ fontSize: '0.7rem' }} />{' '}
                          Reservar
                        </button>
                      )}
                    </div>
                  </div>
                </div>

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

      <aside className="flex items-start gap-3 rounded-xl p-4 mt-5 bg-card border border-border">
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
      </aside>
    </div>
  );
}
