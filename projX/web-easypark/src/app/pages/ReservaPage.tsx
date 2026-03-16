import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { mockParkingLots, ParkingLot, ParkingSpot } from '../data/parkingData';
import { useProfile, type Vehicle } from '../context/ProfileContext';
import { getBrandLogoUrl } from '../utils/brandLogo';

// ── Types ─────────────────────────────────────────────────────────────────────
type ReservaStep = 1 | 2 | 3 | 4;
type SpotFilter = 'todos' | 'standard' | 'ev' | 'accessible';

// ── Constants ──────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Parque & Horário',  icon: 'fa-solid fa-calendar-alt' },
  { id: 2, label: 'Escolha do Lugar',  icon: 'fa-solid fa-car' },
  { id: 3, label: 'Confirmação',        icon: 'fa-solid fa-file-invoice' },
  { id: 4, label: 'Reservado!',         icon: 'fa-solid fa-circle-check' },
];

const SPOT_FILTER_OPTIONS: { key: SpotFilter; label: string; icon: string }[] = [
  { key: 'todos',      label: 'Todos',      icon: 'fa-solid fa-grip' },
  { key: 'standard',   label: 'Padrão',     icon: 'fa-solid fa-square-parking' },
  { key: 'ev',         label: 'EV',         icon: 'fa-solid fa-bolt' },
  { key: 'accessible', label: 'Acessível',  icon: 'fa-solid fa-wheelchair' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function getMinArrivalTime(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 30);
  now.setSeconds(0, 0);
  const mins = now.getMinutes();
  now.setMinutes(Math.ceil(mins / 5) * 5);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function calcHours(arrival: string, exit: string): number {
  if (!arrival || !exit) return 0;
  const diff = (new Date(exit).getTime() - new Date(arrival).getTime()) / 3600000;
  return Math.max(0, diff);
}

function fmtDuration(hours: number): string {
  if (hours <= 0) return '—';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function getDefaultExitTime(arrivalIso: string): string {
  const base = arrivalIso ? new Date(arrivalIso) : new Date(getMinArrivalTime());
  base.setHours(base.getHours() + 2);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}T${pad(base.getHours())}:${pad(base.getMinutes())}`;
}

function calcCost(lot: ParkingLot | null, hours: number): number {
  if (!lot) return 0;
  return Math.min(lot.hourlyRate * hours, lot.dailyMax);
}

function fmtDateTime(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-PT', {
    weekday: 'short', day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtCountdown(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function genBookingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = 'ES-';
  for (let i = 0; i < 8; i++) {
    if (i === 4) c += '-';
    c += chars[Math.floor(Math.random() * chars.length)];
  }
  return c;
}

function isSpotSelectable(spot: ParkingSpot, filter: SpotFilter): boolean {
  if (spot.status === 'occupied' || spot.status === 'reserved') return false;
  if (filter === 'ev' && spot.status !== 'ev') return false;
  if (filter === 'accessible' && spot.status !== 'accessible') return false;
  if (filter === 'standard' && (spot.status === 'ev' || spot.status === 'accessible')) return false;
  return true;
}

function spotColorClasses(spot: ParkingSpot, selected: boolean, selectable: boolean): string {
  if (selected) return 'bg-primary text-primary-content border-primary shadow-md scale-110';
  if (!selectable) {
    if (spot.status === 'occupied') return 'bg-error/80 text-error-content cursor-not-allowed opacity-80';
    if (spot.status === 'reserved') return 'bg-base-300 text-base-content/40 cursor-not-allowed opacity-60';
    return 'bg-base-300 text-base-content/30 cursor-not-allowed opacity-50';
  }
  if (spot.status === 'ev')         return 'bg-warning text-warning-content hover:scale-105 hover:shadow cursor-pointer border-warning';
  if (spot.status === 'accessible') return 'bg-info text-info-content hover:scale-105 hover:shadow cursor-pointer border-info';
  return 'bg-success/80 text-success-content hover:scale-105 hover:shadow cursor-pointer border-success/50';
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: ReservaStep }) {
  return (
    <div className="w-full overflow-x-auto pb-1">
      <ol className="flex items-center min-w-max gap-0" aria-label="Passos da reserva">
        {STEPS.map((s, idx) => {
          const done    = current > s.id;
          const active  = current === s.id;
          const pending = current < s.id;
          return (
            <li key={s.id} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 text-sm
                    ${done    ? 'bg-primary border-primary text-primary-content' : ''}
                    ${active  ? 'bg-primary border-primary text-primary-content shadow-lg shadow-primary/30 ring-4 ring-primary/20' : ''}
                    ${pending ? 'bg-base-200 border-base-300 text-base-content/40' : ''}
                  `}
                  aria-current={active ? 'step' : undefined}
                >
                  {done
                    ? <i className="fa-solid fa-check text-xs" />
                    : <i className={`${s.icon} text-xs`} />
                  }
                </div>
                <span className={`text-xs font-medium whitespace-nowrap px-1
                  ${active  ? 'text-primary' : ''}
                  ${done    ? 'text-primary/70' : ''}
                  ${pending ? 'text-base-content/40' : ''}
                `}>
                  {s.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`w-12 md:w-20 h-0.5 mx-1 mt-[-14px] transition-all duration-500
                  ${current > s.id ? 'bg-primary' : 'bg-base-300'}
                `} />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function CostSummary({
  lot, arrivalTime, exitTime, cost, spotLabel, step,
}: {
  lot: ParkingLot | null;
  arrivalTime: string;
  exitTime: string;
  cost: number;
  spotLabel: string;
  step: ReservaStep;
}) {
  if (step === 4) return null;
  const hours = calcHours(arrivalTime, exitTime);
  return (
    <div className="card bg-base-200 shadow-lg border border-primary/10">
      <div className="card-body p-4 gap-3">
        <h3 className="font-semibold text-base-content flex items-center gap-2">
          <i className="fa-solid fa-receipt text-primary" />
          Resumo da Reserva
        </h3>

        <div className="space-y-2 text-sm">
          {/* Park */}
          <div className="flex items-start gap-2">
            <i className="fa-solid fa-square-parking text-primary mt-0.5 w-4 shrink-0" />
            <div>
              <p className="text-base-content/60 text-xs">Parque</p>
              <p className="font-medium text-base-content">{lot?.name || <span className="text-base-content/30 italic">Não selecionado</span>}</p>
            </div>
          </div>

          {/* Arrival */}
          <div className="flex items-start gap-2">
            <i className="fa-solid fa-clock text-primary mt-0.5 w-4 shrink-0" />
            <div>
              <p className="text-base-content/60 text-xs">Chegada</p>
              <p className="font-medium text-base-content">{arrivalTime ? fmtDateTime(arrivalTime) : <span className="text-base-content/30 italic">Não definida</span>}</p>
            </div>
          </div>

          {/* Exit */}
          <div className="flex items-start gap-2">
            <i className="fa-solid fa-flag-checkered text-primary mt-0.5 w-4 shrink-0" />
            <div>
              <p className="text-base-content/60 text-xs">Saída prevista</p>
              <p className="font-medium text-base-content">
                {exitTime && hours > 0
                  ? <>{fmtDateTime(exitTime)} <span className="text-base-content/50">({fmtDuration(hours)})</span></>
                  : <span className="text-base-content/30 italic">Não definida</span>}
              </p>
            </div>
          </div>

          {/* Spot */}
          {step >= 2 && (
            <div className="flex items-start gap-2">
              <i className="fa-solid fa-location-crosshairs text-primary mt-0.5 w-4 shrink-0" />
              <div>
                <p className="text-base-content/60 text-xs">Lugar</p>
                <p className="font-medium text-base-content">{spotLabel || <span className="text-base-content/30 italic">Não escolhido</span>}</p>
              </div>
            </div>
          )}
        </div>

        <div className="divider my-0" />

        {/* Cost breakdown */}
        {lot && hours > 0 && (
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-base-content/70">
              <span>Tarifa horária</span>
              <span>€{lot.hourlyRate.toFixed(2)}/h</span>
            </div>
            <div className="flex justify-between text-base-content/70">
              <span>Duração</span>
              <span>× {fmtDuration(hours)}</span>
            </div>
            {lot.hourlyRate * hours > lot.dailyMax && (
              <div className="flex justify-between text-success text-xs">
                <span><i className="fa-solid fa-tag mr-1" />Máx. diário aplicado</span>
                <span>— €{(lot.hourlyRate * hours - lot.dailyMax).toFixed(2)}</span>
              </div>
            )}
            <div className="divider my-0" />
            <div className="flex justify-between font-bold text-lg">
              <span className="text-base-content">Total estimado</span>
              <span className="text-primary">€{cost.toFixed(2)}</span>
            </div>
          </div>
        )}

        {(!lot || hours <= 0) && (
          <p className="text-base-content/40 text-xs italic text-center">
            {!lot ? 'Selecione um parque para ver o custo' : 'Defina a hora de saída para ver o custo'}
          </p>
        )}

        
      </div>
    </div>
  );
}

// ── VehiclePicker ─────────────────────────────────────────────────────────────
function VehiclePicker({
  vehicles, selectedVehicleId, setSelectedVehicleId,
}: {
  vehicles: Vehicle[];
  selectedVehicleId: string;
  setSelectedVehicleId: (id: string) => void;
}) {
  if (vehicles.length === 0) return null;

  return (
    <div className="card bg-base-200 shadow-md">
      <div className="card-body p-4">
        <h2 className="font-semibold text-base-content text-lg mb-3">
          <i className="fa-solid fa-car text-primary mr-2" />
          Veículo
        </h2>
        <div className="space-y-2">
          {vehicles.map((v) => {
            const logoUrl = getBrandLogoUrl(v.make);
            const selected = v.id === selectedVehicleId;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVehicleId(selected ? '' : v.id)}
                className={`w-full text-left rounded-xl p-3 border-2 transition-all flex items-center gap-3 ${
                  selected
                    ? 'border-primary bg-primary/5'
                    : 'border-base-300 bg-base-100 hover:border-primary/40'
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-base-200 flex items-center justify-center flex-shrink-0">
                  {logoUrl
                    ? <img src={logoUrl} alt={v.make} className="w-7 h-7 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    : <i className="fa-solid fa-car text-base-content/40" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-sm text-base-content">{v.plate}</span>
                    {v.nickname && <span className="text-xs text-base-content/60">{v.nickname}</span>}
                    {v.isEV && <span className="badge badge-success badge-xs gap-0.5"><i className="fa-solid fa-bolt text-[7px]" />EV</span>}
                    {v.isAccessible && <span className="badge badge-info badge-xs"><i className="fa-solid fa-wheelchair text-[7px]" /></span>}
                    {v.isPrimary && <span className="badge badge-primary badge-xs">Principal</span>}
                  </div>
                  {v.make && v.model && (
                    <p className="text-xs text-base-content/50 mt-0.5">{v.make} {v.model}</p>
                  )}
                </div>
                {selected && <i className="fa-solid fa-circle-check text-primary flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Step 1: Parque & Horário ─────────────────────────────────────────────────
function Step1({
  selectedParkId, setSelectedParkId,
  arrivalTime, setArrivalTime,
  exitTime, setExitTime,
  vehicles, selectedVehicleId, setSelectedVehicleId,
  onNext,
}: {
  selectedParkId: string; setSelectedParkId: (id: string) => void;
  arrivalTime: string; setArrivalTime: (t: string) => void;
  exitTime: string; setExitTime: (t: string) => void;
  vehicles: Vehicle[]; selectedVehicleId: string; setSelectedVehicleId: (id: string) => void;
  onNext: () => void;
}) {
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) ?? null;
  const [search, setSearch] = useState('');
  const [filterEV, setFilterEV] = useState(!!selectedVehicle?.isEV);
  const [filterAccessible, setFilterAccessible] = useState(!!selectedVehicle?.isAccessible);

  useEffect(() => {
    if (!selectedVehicle) return;
    setFilterEV(selectedVehicle.isEV);
    setFilterAccessible(selectedVehicle.isAccessible);
  }, [selectedVehicleId]);
  const minTime = getMinArrivalTime();

  const filtered = useMemo(() =>
    mockParkingLots.filter(l => {
      if (filterEV && !l.hasEVCharger) return false;
      if (filterAccessible && !l.hasAccessible) return false;
      const q = search.toLowerCase();
      return !q || l.name.toLowerCase().includes(q) || l.address.toLowerCase().includes(q);
    }),
    [search, filterEV, filterAccessible]
  );

  const hours = calcHours(arrivalTime, exitTime);
  const exitValid = !!exitTime && !!arrivalTime && exitTime > arrivalTime;

  function handleArrivalChange(val: string) {
    setArrivalTime(val);
    if (exitTime && exitTime <= val) {
      setExitTime(getDefaultExitTime(val));
    }
  }

  const isArrivalValid = !!arrivalTime && new Date(arrivalTime).getTime() > Date.now() + 29 * 60 * 1000;
  const canProceed = !!selectedParkId && isArrivalValid && exitValid;

  return (
    <div className="space-y-6">

      {/* Vehicle picker */}
      <VehiclePicker
        vehicles={vehicles}
        selectedVehicleId={selectedVehicleId}
        setSelectedVehicleId={setSelectedVehicleId}
      />

      {/* 30-min notice */}
      <div className="alert bg-primary/10 border border-primary/20 rounded-2xl p-3">
        <i className="fa-solid fa-circle-info text-primary text-lg" />
        <div>
          <p className="font-semibold text-base-content text-sm">Antecedência mínima de 30 minutos</p>
          <p className="text-base-content/70 text-xs">A reserva é válida durante 30 minutos após a hora marcada. O pagamento é processado automaticamente na entrada.</p>
        </div>
      </div>

      {/* Park selection */}
      <div className="card bg-base-200 shadow-md">
        <div className="card-body p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-base-content text-lg">
              <i className="fa-solid fa-square-parking text-primary mr-2" />
              {selectedParkId ? 'Parque Selecionado' : 'Escolher Parque'}
            </h2>
            {selectedParkId && (
              <button
                onClick={() => setSelectedParkId('')}
                className="btn btn-xs btn-ghost rounded-full text-primary border border-primary/30 gap-1"
                aria-label="Mudar parque"
              >
                <i className="fa-solid fa-pen-to-square text-xs" /> Mudar
              </button>
            )}
          </div>

          {/* Compact selected park card */}
          {selectedParkId && (() => {
            const lot = mockParkingLots.find(l => l.id === selectedParkId)!;
            if (!lot) return null;
            return (
              <div className="flex items-center gap-4 bg-base-100 border border-primary/20 rounded-2xl p-4">
                <div className="shrink-0 w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
                  <i className="fa-solid fa-circle-check text-primary text-xl" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-base-content truncate">{lot.name}</span>
                    {lot.hasEVCharger && <span className="badge badge-warning badge-xs"><i className="fa-solid fa-bolt mr-0.5 text-[8px]" />EV</span>}
                    {lot.hasAccessible && <span className="badge badge-info badge-xs"><i className="fa-solid fa-wheelchair mr-0.5 text-[8px]" />Acess.</span>}
                    {lot.is24h && <span className="badge badge-ghost badge-xs">24h</span>}
                  </div>
                  <p className="text-xs text-base-content/50 mt-0.5 truncate">
                    <i className="fa-solid fa-location-dot mr-1" />{lot.address}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`text-xs font-medium ${lot.availableSpots > 10 ? 'text-success' : lot.availableSpots > 0 ? 'text-warning' : 'text-error'}`}>
                      <i className="fa-solid fa-car-side mr-1" />{lot.availableSpots} livres
                    </span>
                    <span className="text-xs text-base-content/30">·</span>
                    <span className="text-xs text-base-content/50">
                      <i className="fa-solid fa-person-walking mr-1" />{lot.walkingTime}
                    </span>
                    <span className="text-xs text-base-content/30">·</span>
                    <span className="text-xs font-semibold text-primary">€{lot.hourlyRate.toFixed(2)}/h</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Full park search + list (shown only when no park selected) */}
          {!selectedParkId && (
            <>
              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <div className="relative flex-1">
                  <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40 text-sm" />
                  <input
                    type="text"
                    className="input input-sm w-full pl-9 rounded-full bg-base-100 border-base-300 text-base-content"
                    placeholder="Pesquisar parque ou morada..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    aria-label="Pesquisar parque"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilterEV(!filterEV)}
                    className={`btn btn-xs rounded-full gap-1 ${filterEV ? 'btn-warning' : 'btn-outline border-base-300 text-base-content/60'}`}
                    aria-pressed={filterEV}
                  >
                    <i className="fa-solid fa-bolt" /> EV
                  </button>
                  <button
                    onClick={() => setFilterAccessible(!filterAccessible)}
                    className={`btn btn-xs rounded-full gap-1 ${filterAccessible ? 'btn-info text-info-content' : 'btn-outline border-base-300 text-base-content/60'}`}
                    aria-pressed={filterAccessible}
                  >
                    <i className="fa-solid fa-wheelchair" /> Acessível
                  </button>
                </div>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1" role="radiogroup" aria-label="Lista de parques">
                {filtered.length === 0 && (
                  <p className="text-center text-base-content/40 py-6 text-sm italic">Nenhum parque encontrado.</p>
                )}
                {filtered.map(lot => {
                  const occupied = lot.totalSpots - lot.availableSpots;
                  const pct = Math.round((occupied / lot.totalSpots) * 100);
                  return (
                    <button
                      key={lot.id}
                      role="radio"
                      aria-checked={false}
                      onClick={() => setSelectedParkId(lot.id)}
                      className="w-full text-left rounded-2xl p-3 border-2 border-base-300 bg-base-100 hover:border-primary/40 transition-all duration-200 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-base-content truncate">{lot.name}</span>
                            {lot.hasEVCharger && <span className="badge badge-warning badge-xs gap-1"><i className="fa-solid fa-bolt text-[8px]" />EV</span>}
                            {lot.hasAccessible && <span className="badge badge-info badge-xs gap-1"><i className="fa-solid fa-wheelchair text-[8px]" />Acessível</span>}
                            {lot.is24h && <span className="badge badge-primary badge-xs">24h</span>}
                          </div>
                          <p className="text-xs text-base-content/60 mt-0.5 truncate">
                            <i className="fa-solid fa-location-dot mr-1" />{lot.address}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className={`text-xs font-semibold ${lot.availableSpots > 10 ? 'text-success' : lot.availableSpots > 0 ? 'text-warning' : 'text-error'}`}>
                              <i className="fa-solid fa-circle text-[6px] mr-1 align-middle" />
                              {lot.availableSpots} livres
                            </span>
                            <span className="text-xs text-base-content/50">{lot.distance}</span>
                            <span className="text-xs text-base-content/50">
                              <i className="fa-solid fa-person-walking mr-0.5" />{lot.walkingTime}
                            </span>
                          </div>
                          <div className="w-full bg-base-300 rounded-full h-1 mt-2">
                            <div
                              className={`h-1 rounded-full transition-all ${pct > 80 ? 'bg-error' : pct > 50 ? 'bg-warning' : 'bg-success'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-primary font-bold text-sm">€{lot.hourlyRate.toFixed(2)}<span className="text-xs font-normal text-base-content/50">/h</span></p>
                          <p className="text-base-content/50 text-xs">máx €{lot.dailyMax.toFixed(2)}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Date, Time & Duration */}
      <div className="card bg-base-200 shadow-md">
        <div className="card-body p-4">
          <h2 className="font-semibold text-base-content text-lg mb-3">
            <i className="fa-solid fa-clock text-primary mr-2" />
            Data & Horário
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Arrival time */}
            <div className="form-control">
              <label className="label pb-1">
                <span className="label-text font-medium text-base-content text-sm">
                  <i className="fa-solid fa-calendar-day mr-1.5 text-primary" />
                  Data e hora de chegada
                </span>
              </label>
              <input
                type="datetime-local"
                className="input input-sm rounded-xl bg-base-100 border-base-300 text-base-content w-full"
                value={arrivalTime}
                min={minTime}
                onChange={e => handleArrivalChange(e.target.value)}
                aria-label="Data e hora de chegada"
              />
              {!isArrivalValid && (
                <p className="text-error text-xs mt-1">
                  <i className="fa-solid fa-triangle-exclamation mr-1" />
                  A reserva requer pelo menos 30 minutos de antecedência.
                </p>
              )}
              {isArrivalValid && (
                <p className="text-success text-xs mt-1">
                  <i className="fa-solid fa-check mr-1" />
                  {fmtDateTime(arrivalTime)}
                </p>
              )}
            </div>

            {/* Exit time */}
            <div className="form-control">
              <label className="label pb-1" htmlFor="exit-input">
                <span className="label-text font-medium text-base-content text-sm">
                  <i className="fa-solid fa-flag-checkered mr-1.5 text-primary" />
                  Hora de saída prevista
                </span>
              </label>
              <input
                id="exit-input"
                type="datetime-local"
                className="input input-sm rounded-xl bg-base-100 border-base-300 text-base-content w-full"
                value={exitTime}
                min={arrivalTime || minTime}
                onChange={e => setExitTime(e.target.value)}
                aria-label="Hora de saída prevista"
              />
              {exitTime && !exitValid && (
                <p className="text-error text-xs mt-1">
                  <i className="fa-solid fa-triangle-exclamation mr-1" />
                  A saída deve ser posterior à chegada.
                </p>
              )}
              {exitValid && (
                <p className="text-success text-xs mt-1">
                  <i className="fa-solid fa-check mr-1" />
                  {fmtDateTime(exitTime)}
                  <span className="text-base-content/50 ml-1">· {fmtDuration(hours)}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Next CTA */}
      <button
        onClick={onNext}
        disabled={!canProceed}
        className="btn btn-primary rounded-full w-full text-base shadow-lg shadow-primary/30 disabled:opacity-40"
        aria-label="Avançar para escolha do lugar"
      >
        <i className="fa-solid fa-arrow-right mr-2" />
        Escolher Lugar
      </button>
    </div>
  );
}

// ── Step 2: Escolha do Lugar ──────────────────────────────────────────────────
function Step2({
  lot, spotFilter, setSpotFilter,
  selectedFloorId, setSelectedFloorId,
  selectedSpotId, setSelectedSpotId,
  onNext, onBack,
}: {
  lot: ParkingLot;
  spotFilter: SpotFilter; setSpotFilter: (f: SpotFilter) => void;
  selectedFloorId: string; setSelectedFloorId: (id: string) => void;
  selectedSpotId: string; setSelectedSpotId: (id: string) => void;
  onNext: () => void; onBack: () => void;
}) {
  const floor = lot.floors.find(f => f.id === selectedFloorId) || lot.floors[0];
  const selectedSpot = floor?.spots.find(s => s.id === selectedSpotId) || null;

  // Group spots by row
  const spotsByRow = useMemo(() => {
    if (!floor) return {};
    return floor.spots.reduce((acc, spot) => {
      if (!acc[spot.row]) acc[spot.row] = [];
      acc[spot.row].push(spot);
      return acc;
    }, {} as Record<number, ParkingSpot[]>);
  }, [floor]);

  const rowLabel = (row: number) => String.fromCharCode(65 + row);

  const freeCounts = useMemo(() => {
    if (!floor) return { free: 0, ev: 0, accessible: 0, occupied: 0, reserved: 0 };
    return floor.spots.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [floor]);

  return (
    <div className="space-y-4">

      {/* Floor selector */}
      {lot.floors.length > 1 && (
        <div className="flex gap-2 flex-wrap" role="tablist" aria-label="Selecionar piso">
          {lot.floors.map(f => (
            <button
              key={f.id}
              role="tab"
              aria-selected={f.id === selectedFloorId}
              onClick={() => { setSelectedFloorId(f.id); setSelectedSpotId(''); }}
              className={`btn btn-sm rounded-full transition-all ${f.id === selectedFloorId ? 'btn-primary' : 'btn-outline btn-primary'}`}
            >
              <i className="fa-solid fa-layer-group mr-1.5" />
              {f.name}
            </button>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div className="card bg-base-200 shadow-md">
        <div className="card-body p-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-2 flex-wrap" role="group" aria-label="Filtrar tipo de lugar">
              {SPOT_FILTER_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => { setSpotFilter(opt.key); setSelectedSpotId(''); }}
                  className={`btn btn-xs rounded-full gap-1 ${spotFilter === opt.key ? 'btn-primary' : 'btn-ghost text-base-content/60 hover:bg-base-300'}`}
                  aria-pressed={spotFilter === opt.key}
                >
                  <i className={opt.icon} /> {opt.label}
                </button>
              ))}
            </div>
            <div className="flex gap-3 text-xs text-base-content/60 flex-wrap">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-success/80 inline-block" /> Livre ({freeCounts.free || 0})</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-error/80 inline-block" /> Ocupado ({freeCounts.occupied || 0})</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-warning inline-block" /> EV ({freeCounts.ev || 0})</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-info inline-block" /> Acessível ({freeCounts.accessible || 0})</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-primary inline-block" /> Selecionado</span>
            </div>
          </div>
        </div>
      </div>

      {/* Spot grid */}
      <div className="card bg-base-200 shadow-md">
        <div className="card-body p-4">
          {/* Entrance indicator */}
          <div className="flex items-center justify-center mb-3">
            <div className="flex items-center gap-2 bg-base-100 rounded-full px-4 py-1.5 border border-base-300">
              <i className="fa-solid fa-arrow-down text-primary" />
              <span className="text-xs font-semibold text-base-content/70 uppercase tracking-wider">Entrada / Saída</span>
              <i className="fa-solid fa-arrow-down text-primary" />
            </div>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="inline-block min-w-full">
              {Object.entries(spotsByRow).map(([rowStr, spots]) => {
                const row = Number(rowStr);
                return (
                  <div key={row} className="flex items-center gap-1 mb-1.5">
                    {/* Row label */}
                    <div className="w-5 shrink-0 text-center text-xs font-bold text-base-content/40 select-none">
                      {rowLabel(row)}
                    </div>
                    {/* Aisle gap every half of columns */}
                    {(spots as ParkingSpot[]).map((spot, colIdx) => {
                      const selectable = isSpotSelectable(spot, spotFilter);
                      const selected = spot.id === selectedSpotId;
                      const classes = spotColorClasses(spot, selected, selectable);
                      const needsAisle = colIdx === Math.floor((spots as ParkingSpot[]).length / 2);
                      return (
                        <div key={spot.id} className="flex gap-0 items-center">
                          {needsAisle && <div className="w-4 shrink-0" aria-hidden="true" />}
                          <button
                            onClick={() => selectable && setSelectedSpotId(selected ? '' : spot.id)}
                            disabled={!selectable}
                            title={`${spot.label} — ${spot.status === 'free' ? 'Livre' : spot.status === 'occupied' ? 'Ocupado' : spot.status === 'reserved' ? 'Reservado' : spot.status === 'ev' ? 'EV' : 'Acessível'}`}
                            aria-label={`Lugar ${spot.label}`}
                            aria-pressed={selected}
                            className={`w-7 h-7 md:w-8 md:h-8 shrink-0 rounded border flex items-center justify-center text-[9px] md:text-[10px] font-bold transition-all duration-150 select-none focus:outline-none focus:ring-2 focus:ring-primary/50 ${classes}`}
                          >
                            {selected
                              ? <i className="fa-solid fa-check text-[8px]" />
                              : spot.status === 'ev'
                                ? <i className="fa-solid fa-bolt text-[8px]" />
                                : spot.status === 'accessible'
                                  ? <i className="fa-solid fa-wheelchair text-[8px]" />
                                  : spot.label
                            }
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected spot info */}
          {selectedSpot && (
            <div className="mt-3 p-3 bg-primary/10 rounded-xl border border-primary/20 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0">
                <span className="text-primary-content font-bold text-sm">{selectedSpot.label}</span>
              </div>
              <div>
                <p className="font-semibold text-base-content text-sm">Lugar {selectedSpot.label} selecionado</p>
                <p className="text-xs text-base-content/60">
                  {floor.name}
                  {selectedSpot.status === 'ev' && ' · Carregamento EV disponível'}
                  {selectedSpot.status === 'accessible' && ' · Lugar de mobilidade reduzida'}
                </p>
              </div>
              <button
                onClick={() => setSelectedSpotId('')}
                className="btn btn-xs btn-ghost rounded-full ml-auto"
                aria-label="Remover seleção"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={onBack} className="btn btn-ghost rounded-full flex-1 border border-base-300">
          <i className="fa-solid fa-arrow-left mr-2" /> Voltar
        </button>
        <button
          onClick={onNext}
          disabled={!selectedSpotId}
          className="btn btn-primary rounded-full flex-1 shadow-lg shadow-primary/30 disabled:opacity-40"
        >
          Confirmar Lugar <i className="fa-solid fa-arrow-right ml-2" />
        </button>
      </div>
    </div>
  );
}

// ── Step 3: Confirmação ───────────────────────────────────────────────────────
function Step3({
  lot, floor, spot, arrivalTime, exitTime, cost,
  vehicle, agreeTerms, setAgreeTerms,
  onConfirm, onBack,
}: {
  lot: ParkingLot; floor: string; spot: ParkingSpot | null;
  arrivalTime: string; exitTime: string; cost: number;
  vehicle: Vehicle | null;
  agreeTerms: boolean; setAgreeTerms: (b: boolean) => void;
  onConfirm: () => void; onBack: () => void;
}) {
  const hours = calcHours(arrivalTime, exitTime);

  return (
    <div className="space-y-4">

      {/* Summary */}
      <div className="card bg-base-200 shadow-md">
        <div className="card-body p-4">
          <h2 className="font-semibold text-base-content text-lg mb-3">
            <i className="fa-solid fa-list-check text-primary mr-2" />
            Resumo da Reserva
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { icon: 'fa-square-parking',   label: 'Parque',  value: lot.name },
              { icon: 'fa-location-dot',      label: 'Morada',  value: lot.address },
              { icon: 'fa-calendar-day',      label: 'Chegada', value: fmtDateTime(arrivalTime) },
              { icon: 'fa-flag-checkered',    label: 'Saída',   value: `${fmtDateTime(exitTime)} (${fmtDuration(hours)})` },
              { icon: 'fa-layer-group',       label: 'Piso',    value: floor },
              { icon: 'fa-car',               label: 'Lugar',   value: spot?.label || '—' },
              ...(vehicle ? [{ icon: 'fa-id-card', label: 'Veículo', value: `${vehicle.plate}${vehicle.make ? ` · ${vehicle.make}` : ''}` }] : []),
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex items-start gap-2">
                <i className={`fa-solid ${icon} text-primary mt-0.5 w-4 shrink-0`} />
                <div>
                  <p className="text-base-content/50 text-xs">{label}</p>
                  <p className="font-medium text-base-content">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cost breakdown */}
      <div className="card bg-base-200 shadow-md">
        <div className="card-body p-4">
          <h2 className="font-semibold text-base-content text-lg mb-3">
            <i className="fa-solid fa-euro-sign text-primary mr-2" />
            Custo Total
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-base-content/70">
              <span>Tarifa horária</span>
              <span>€{lot.hourlyRate.toFixed(2)}/h</span>
            </div>
            <div className="flex justify-between text-base-content/70">
              <span>Duração ({fmtDuration(hours)})</span>
              <span>€{(lot.hourlyRate * hours).toFixed(2)}</span>
            </div>
            {lot.hourlyRate * hours > lot.dailyMax && (
              <div className="flex justify-between text-success text-xs">
                <span><i className="fa-solid fa-tag mr-1" />Desconto máximo diário</span>
                <span>−€{(lot.hourlyRate * hours - lot.dailyMax).toFixed(2)}</span>
              </div>
            )}
            <div className="divider my-1" />
            <div className="flex justify-between font-bold text-xl">
              <span className="text-base-content">Total</span>
              <span className="text-primary">€{cost.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Automatic payment info */}
      <div className="alert bg-primary/10 border border-primary/20 rounded-2xl p-4">
        <i className="fa-solid fa-shield-halved text-primary text-2xl" />
        <div>
          <p className="font-semibold text-base-content text-sm mb-1">Identificação Automática</p>
          <p className="text-base-content/70 text-xs">
            O seu veículo será identificado automaticamente na entrada através do sistema associado ao seu perfil. 
            O pagamento será processado pelo método de pagamento definido nas suas definições.
          </p>
        </div>
      </div>

      {/* Terms */}
      <div className="card bg-base-200 shadow-md">
        <div className="card-body p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="checkbox checkbox-primary mt-0.5 shrink-0"
              checked={agreeTerms}
              onChange={e => setAgreeTerms(e.target.checked)}
              aria-label="Aceitar termos e condições"
            />
            <span className="text-sm text-base-content/80">
              Aceito os <span className="text-primary underline cursor-pointer">termos e condições</span> da reserva e autorizo a cobrança automática. A reserva é válida por <strong>30 minutos</strong> após a hora marcada.
            </span>
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={onBack} className="btn btn-ghost rounded-full flex-1 border border-base-300">
          <i className="fa-solid fa-arrow-left mr-2" /> Voltar
        </button>
        <button
          onClick={onConfirm}
          disabled={!agreeTerms}
          className="btn btn-primary rounded-full flex-1 shadow-lg shadow-primary/30 disabled:opacity-40"
          aria-label="Confirmar e reservar lugar"
        >
          <i className="fa-solid fa-lock mr-2" />
          Confirmar Reserva
        </button>
      </div>
    </div>
  );
}

// ── Step 4: Confirmado ────────────────────────────────────────────────────────
function Step4({
  bookingCode, countdown, lot, spot, vehicle, arrivalTime, exitTime, cost,
  onNewBooking, onNavigate,
}: {
  bookingCode: string; countdown: number;
  lot: ParkingLot | null; spot: ParkingSpot | null; vehicle: Vehicle | null;
  arrivalTime: string; exitTime: string; cost: number;
  onNewBooking: () => void; onNavigate: () => void;
}) {
  const codeRef = useRef<HTMLDivElement>(null);
  const hours = calcHours(arrivalTime, exitTime);
  const pct = (countdown / (30 * 60)) * 100;
  const isExpiring = countdown < 5 * 60;
  const isExpired = countdown === 0;

  function copyCode() {
    navigator.clipboard.writeText(bookingCode).catch(() => {});
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4">

      {/* Success icon */}
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-success/20 flex items-center justify-center animate-bounce">
          <div className="w-16 h-16 rounded-full bg-success flex items-center justify-center">
            <i className="fa-solid fa-check text-success-content text-3xl" />
          </div>
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-base-content mb-1">Reserva Confirmada!</h2>
        <p className="text-base-content/60 text-sm">
          O seu lugar está garantido. Apresente o código ou dirija-se ao parque.
        </p>
      </div>

      {/* Booking code card */}
      <div className="card bg-base-200 shadow-xl w-full max-w-md border-2 border-primary/20">
        <div className="card-body p-6 text-center">
          <p className="text-xs text-base-content/50 uppercase tracking-widest mb-2">Código de Reserva</p>
          <div
            ref={codeRef}
            className="text-3xl font-bold font-mono tracking-[0.15em] text-primary bg-primary/10 rounded-2xl py-4 px-6 select-all"
            aria-label={`Código de reserva: ${bookingCode}`}
          >
            {bookingCode}
          </div>
          <button
            onClick={copyCode}
            className="btn btn-xs btn-ghost rounded-full mt-2 text-base-content/60"
            aria-label="Copiar código de reserva"
          >
            <i className="fa-solid fa-copy mr-1" /> Copiar código
          </button>

          {/* QR placeholder */}
          <div className="mt-3 w-24 h-24 mx-auto rounded-xl bg-base-300 flex flex-col items-center justify-center border-2 border-dashed border-base-content/20">
            <i className="fa-solid fa-qrcode text-base-content/30 text-3xl" />
            <p className="text-[9px] text-base-content/30 mt-1">QR Code</p>
          </div>
        </div>
      </div>

      {/* Countdown timer */}
      <div className="card w-full max-w-md shadow-md border border-base-300 bg-base-200">
        <div className="card-body p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <i className={`fa-solid fa-hourglass-${isExpiring ? 'end' : 'half'} ${isExpired ? 'text-error' : isExpiring ? 'text-warning' : 'text-primary'}`} />
              <span className="text-sm font-semibold text-base-content">
                {isExpired ? 'Reserva expirada' : 'Validade da reserva'}
              </span>
            </div>
            <span className={`text-2xl font-mono font-bold ${isExpired ? 'text-error' : isExpiring ? 'text-warning' : 'text-primary'}`}>
              {fmtCountdown(countdown)}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-base-300 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-1000 ${isExpired ? 'bg-error' : isExpiring ? 'bg-warning' : 'bg-primary'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {isExpiring && !isExpired && (
            <p className="text-warning text-xs mt-1.5 flex items-center gap-1">
              <i className="fa-solid fa-triangle-exclamation" />
              A reserva expira em breve! Dirija-se ao parque.
            </p>
          )}
          {isExpired && (
            <p className="text-error text-xs mt-1.5 flex items-center gap-1">
              <i className="fa-solid fa-circle-xmark" />
              A reserva expirou. Pode efetuar uma nova reserva.
            </p>
          )}
        </div>
      </div>

      {/* Booking details */}
      {lot && (
        <div className="card w-full max-w-md bg-base-200 shadow-md border border-base-300">
          <div className="card-body p-4">
            <h3 className="font-semibold text-base-content text-sm mb-2">
              <i className="fa-solid fa-circle-info text-primary mr-2" />
              Detalhes da Reserva
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><p className="text-base-content/50">Parque</p><p className="font-medium text-base-content">{lot.name}</p></div>
              <div><p className="text-base-content/50">Lugar</p><p className="font-medium text-base-content">{spot?.label || '—'}</p></div>
              <div><p className="text-base-content/50">Chegada</p><p className="font-medium text-base-content">{fmtDateTime(arrivalTime)}</p></div>
              <div><p className="text-base-content/50">Saída prevista</p><p className="font-medium text-base-content">{fmtDateTime(exitTime)} <span className="text-base-content/50">({fmtDuration(hours)})</span></p></div>
              <div><p className="text-base-content/50">Custo total</p><p className="font-bold text-primary">€{cost.toFixed(2)}</p></div>
              <div><p className="text-base-content/50">Telefone</p><p className="font-medium text-base-content">{lot.phone}</p></div>
              {vehicle && (
                <div className="col-span-2">
                  <p className="text-base-content/50">Veículo</p>
                  <p className="font-medium text-base-content font-mono">{vehicle.plate}{vehicle.make ? ` · ${vehicle.make} ${vehicle.model ?? ''}` : ''}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
        <button
          onClick={onNavigate}
          className="btn btn-primary rounded-full flex-1 shadow-lg shadow-primary/30"
        >
          <i className="fa-solid fa-map-location-dot mr-2" /> Ver no Mapa
        </button>
        <button
          onClick={onNewBooking}
          className="btn btn-outline btn-primary rounded-full flex-1"
        >
          <i className="fa-solid fa-plus mr-2" /> Nova Reserva
        </button>
      </div>

      <div className="flex gap-4">
        <button className="btn btn-ghost btn-xs rounded-full text-base-content/50">
          <i className="fa-solid fa-share-nodes mr-1" /> Partilhar
        </button>
        <button className="btn btn-ghost btn-xs rounded-full text-base-content/50">
          <i className="fa-solid fa-calendar-plus mr-1" /> Adicionar ao Calendário
        </button>
        <button className="btn btn-ghost btn-xs rounded-full text-base-content/50">
          <i className="fa-solid fa-download mr-1" /> Guardar PDF
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function ReservaPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const parkIdParam = searchParams.get('parkId') || '';
  const { vehicles } = useProfile();

  // Step
  const [step, setStep] = useState<ReservaStep>(1);

  // Vehicle selection
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    () => vehicles.find((v) => v.isPrimary)?.id ?? ''
  );
  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) ?? null,
    [vehicles, selectedVehicleId]
  );

  // Step 1
  const [selectedParkId, setSelectedParkId] = useState<string>(parkIdParam);
  const [arrivalTime, setArrivalTime]         = useState<string>(getMinArrivalTime());
  const [exitTime, setExitTime]               = useState<string>(getDefaultExitTime(getMinArrivalTime()));

  // Step 2
  const [selectedFloorId, setSelectedFloorId] = useState<string>('');
  const [selectedSpotId, setSelectedSpotId]   = useState<string>('');
  const [spotFilter, setSpotFilter]           = useState<SpotFilter>('todos');

  // Auto-adapt spot filter when vehicle changes
  useEffect(() => {
    if (selectedVehicle?.isEV) setSpotFilter('ev');
    else if (selectedVehicle?.isAccessible) setSpotFilter('accessible');
    else setSpotFilter('todos');
  }, [selectedVehicleId]);

  // Step 3
  const [agreeTerms, setAgreeTerms]         = useState(false);

  // Step 4
  const [bookingCode, setBookingCode] = useState<string>('');
  const [countdown, setCountdown]     = useState(30 * 60);

  // Derived
  const selectedLot = useMemo(() =>
    mockParkingLots.find(l => l.id === selectedParkId) || null,
    [selectedParkId]
  );
  const estimatedCost = calcCost(selectedLot, calcHours(arrivalTime, exitTime));

  const selectedFloor = useMemo(() =>
    selectedLot?.floors.find(f => f.id === selectedFloorId) || selectedLot?.floors[0] || null,
    [selectedLot, selectedFloorId]
  );
  const selectedSpot = useMemo(() =>
    selectedFloor?.spots.find(s => s.id === selectedSpotId) || null,
    [selectedFloor, selectedSpotId]
  );
  const spotLabel = selectedSpot
    ? `${selectedFloor?.name} · Lugar ${selectedSpot.label}`
    : '';

  // Init floor when park changes
  useEffect(() => {
    if (selectedLot?.floors.length) {
      setSelectedFloorId(selectedLot.floors[0].id);
      setSelectedSpotId('');
    }
  }, [selectedLot]);

  // Countdown (step 4)
  useEffect(() => {
    if (step !== 4) return;
    const interval = setInterval(() => {
      setCountdown(c => (c <= 0 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  function handleNewBooking() {
    setStep(1);
    setSelectedSpotId('');
    setAgreeTerms(false);
    setBookingCode('');
    setCountdown(30 * 60);
  }

  function handleConfirm() {
    setBookingCode(genBookingCode());
    setCountdown(30 * 60);
    setStep(4);
  }

  return (
    <div className="min-h-screen bg-base-100">
      {/* Page header */}
      <div className="bg-base-200 border-b border-base-300 px-4 md:px-6 py-4">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold text-base-content flex items-center gap-2">
              <i className="fa-solid fa-bookmark text-primary" />
              Reservar Lugar
            </h1>
            <p className="text-base-content/60 text-sm mt-0.5">
              Reservas disponíveis com pelo menos 30 minutos de antecedência · Válidas 30 min após a hora marcada
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6">
        {/* Step indicator */}
        <div className="mb-6">
          <StepIndicator current={step} />
        </div>

        {/* Layout: content + sidebar */}
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {step === 1 && (
              <Step1
                selectedParkId={selectedParkId}
                setSelectedParkId={setSelectedParkId}
                arrivalTime={arrivalTime}
                setArrivalTime={setArrivalTime}
                exitTime={exitTime}
                setExitTime={setExitTime}
                vehicles={vehicles}
                selectedVehicleId={selectedVehicleId}
                setSelectedVehicleId={setSelectedVehicleId}
                onNext={() => setStep(2)}
              />
            )}
            {step === 2 && selectedLot && (
              <Step2
                lot={selectedLot}
                spotFilter={spotFilter}
                setSpotFilter={setSpotFilter}
                selectedFloorId={selectedFloorId}
                setSelectedFloorId={setSelectedFloorId}
                selectedSpotId={selectedSpotId}
                setSelectedSpotId={setSelectedSpotId}
                onNext={() => setStep(3)}
                onBack={() => setStep(1)}
              />
            )}
            {step === 3 && selectedLot && (
              <Step3
                lot={selectedLot}
                floor={selectedFloor?.name || '—'}
                spot={selectedSpot}
                arrivalTime={arrivalTime}
                exitTime={exitTime}
                cost={estimatedCost}
                vehicle={selectedVehicle}
                agreeTerms={agreeTerms}
                setAgreeTerms={setAgreeTerms}
                onConfirm={handleConfirm}
                onBack={() => setStep(2)}
              />
            )}
            {step === 4 && (
              <Step4
                bookingCode={bookingCode}
                countdown={countdown}
                lot={selectedLot}
                spot={selectedSpot}
                vehicle={selectedVehicle}
                arrivalTime={arrivalTime}
                exitTime={exitTime}
                cost={estimatedCost}
                onNewBooking={handleNewBooking}
                onNavigate={() => navigate('/mapa')}
              />
            )}
          </div>

          {/* Sidebar cost summary (desktop) */}
          {step < 3 && (
            <aside className="lg:w-80 lg:sticky lg:top-4 lg:self-start" aria-label="Resumo do custo">
              <CostSummary
                lot={selectedLot}
                arrivalTime={arrivalTime}
                exitTime={exitTime}
                cost={estimatedCost}
                spotLabel={spotLabel}
                step={step}
              />

              {/* Tech features info */}
              {selectedLot && (
                <div className="card bg-base-200 shadow-md mt-4">
                  
                </div>
              )}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}