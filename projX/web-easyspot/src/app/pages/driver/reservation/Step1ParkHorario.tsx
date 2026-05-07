import { useState, useEffect, useMemo } from 'react';
import type { ParkingLot } from '../../../data/parkingTypes';
import type { Vehicle } from '../../../context/ProfileContext';
import { getBrandLogoUrl } from '../../../utils/brandLogo';
import { getMinArrivalTime, getDefaultExitTime, calcHours, fmtDateTime, fmtDuration } from './reservationHelpers';

function VehiclePicker({
  vehicles, selectedVehicleId, setSelectedVehicleId,
}: Readonly<{
  vehicles: Vehicle[];
  selectedVehicleId: string;
  setSelectedVehicleId: (id: string) => void;
}>) {
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
            const logoUrl = v.brandLogoUrl ?? getBrandLogoUrl(v.make);
            const selected = v.id === selectedVehicleId;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVehicleId(selected ? '' : v.id)}
                className={`w-full text-left rounded-xl p-3 border-2 transition-all flex items-center gap-3 ${
                  selected ? 'border-primary bg-primary/5' : 'border-base-300 bg-base-100 hover:border-primary/40'
                }`}
              >
                {v.imageUrl
                  ? <img src={v.imageUrl} alt={v.plate} className="w-16 h-11 object-cover rounded-lg flex-shrink-0" />
                  : (
                    <div className="w-9 h-9 rounded-lg bg-base-200 flex items-center justify-center flex-shrink-0">
                      {logoUrl
                        ? <img src={logoUrl} alt={v.make} className="w-7 h-7 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        : <i className="fa-solid fa-car text-base-content/40" />}
                    </div>
                  )
                }
                {v.imageUrl && logoUrl && (
                  <div className="w-6 h-6 rounded-full bg-base-200 flex items-center justify-center flex-shrink-0 -ml-2 border border-base-100">
                    <img src={logoUrl} alt={v.make} className="w-4 h-4 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-sm text-base-content">{v.plate}</span>
                    {v.nickname && <span className="text-xs text-base-content/60">{v.nickname}</span>}
                    {v.isEV && <span className="badge badge-success badge-xs gap-0.5"><i className="fa-solid fa-bolt text-[7px]" />{' '}EV</span>}
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

export function Step1ParkHorario({
  selectedParkId, setSelectedParkId,
  arrivalTime, setArrivalTime,
  exitTime, setExitTime,
  vehicles, selectedVehicleId, setSelectedVehicleId,
  parks,
  onNext,
}: Readonly<{
  selectedParkId: string; setSelectedParkId: (id: string) => void;
  arrivalTime: string; setArrivalTime: (t: string) => void;
  exitTime: string; setExitTime: (t: string) => void;
  vehicles: Vehicle[]; selectedVehicleId: string; setSelectedVehicleId: (id: string) => void;
  parks: ParkingLot[];
  onNext: () => void;
}>) {
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
    parks.filter(l => {
      if (filterEV && !l.hasEVCharger) return false;
      if (filterAccessible && !l.hasAccessible) return false;
      const q = search.toLowerCase();
      return !q || l.name.toLowerCase().includes(q) || l.address.toLowerCase().includes(q);
    }),
    [search, filterEV, filterAccessible, parks]
  );

  const hours = calcHours(arrivalTime, exitTime);
  const exitValid = !!exitTime && !!arrivalTime && exitTime > arrivalTime;
  const isArrivalValid = !!arrivalTime && new Date(arrivalTime).getTime() > Date.now() + 29 * 60 * 1000;
  const canProceed = !!selectedParkId && isArrivalValid && exitValid;

  function handleArrivalChange(val: string) {
    setArrivalTime(val);
    if (exitTime && exitTime <= val) setExitTime(getDefaultExitTime(val));
  }

  const availabilityClass = (availableSpots: number) => {
    if (availableSpots > 10) return 'text-success';
    return availableSpots > 0 ? 'text-warning' : 'text-error';
  };
  const occupancyClass = (pct: number) => {
    if (pct > 80) return 'bg-error';
    return pct > 50 ? 'bg-warning' : 'bg-success';
  };
  const selectedLot = parks.find(l => l.id === selectedParkId);

  return (
    <div className="space-y-6">
      <VehiclePicker
        vehicles={vehicles}
        selectedVehicleId={selectedVehicleId}
        setSelectedVehicleId={setSelectedVehicleId}
      />

      <div className="alert bg-primary/10 border border-primary/20 rounded-2xl p-3">
        <i className="fa-solid fa-circle-info text-primary text-lg" />
        <div>
          <p className="font-semibold text-base-content text-sm">Antecedência mínima de 30 minutos</p>
          <p className="text-base-content/70 text-xs">A reserva é válida durante 30 minutos após a hora marcada. O pagamento é processado automaticamente na entrada.</p>
        </div>
      </div>

      <div className="card bg-base-200 shadow-md">
        <div className="card-body p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-base-content text-lg">
              <i className="fa-solid fa-square-parking text-primary mr-2" />{' '}
              {selectedParkId ? 'Parque Selecionado' : 'Escolher Parque'}
            </h2>
            {selectedParkId && (
              <button
                onClick={() => setSelectedParkId('')}
                className="btn btn-xs btn-ghost rounded-full text-primary border border-primary/30 gap-1"
                aria-label="Mudar parque"
              >
                <i className="fa-solid fa-pen-to-square text-xs" />{' '}
                Mudar
              </button>
            )}
          </div>

          {selectedLot && (() => {
            const lot = selectedLot;
            return (
              <div className="flex items-center gap-4 bg-base-100 border border-primary/20 rounded-2xl p-4">
                <div className="shrink-0 w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
                  <i className="fa-solid fa-circle-check text-primary text-xl" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-base-content truncate">{lot.name}</span>
                    {lot.hasEVCharger && <span className="badge badge-warning badge-xs"><i className="fa-solid fa-bolt mr-0.5 text-[8px]" />{' '}EV</span>}
                    {lot.hasAccessible && <span className="badge badge-info badge-xs"><i className="fa-solid fa-wheelchair mr-0.5 text-[8px]" />{' '}Acess.</span>}
                    {lot.is24h && <span className="badge badge-ghost badge-xs">24h</span>}
                  </div>
                  <p className="text-xs text-base-content/50 mt-0.5 truncate">
                    <i className="fa-solid fa-location-dot mr-1" />
                    {lot.address}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`text-xs font-medium ${availabilityClass(lot.availableSpots)}`}>
                      <i className="fa-solid fa-car-side mr-1" />
                      {lot.availableSpots} livres
                    </span>
                    <span className="text-xs text-base-content/30">·</span>
                    <span className="text-xs text-base-content/50"><i className="fa-solid fa-person-walking mr-1" /> {lot.walkingTime}</span>
                    <span className="text-xs text-base-content/30">·</span>
                    <span className="text-xs font-semibold text-primary">€{lot.hourlyRate.toFixed(2)}/h</span>
                  </div>
                </div>
              </div>
            );
          })()}

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
                  const pct = Math.round(((lot.totalSpots - lot.availableSpots) / lot.totalSpots) * 100);
                  return (
                    <button
                      key={lot.id}
                      aria-pressed={false}
                      onClick={() => setSelectedParkId(lot.id)}
                      className="w-full text-left rounded-2xl p-3 border-2 border-base-300 bg-base-100 hover:border-primary/40 transition-all duration-200 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-base-content truncate">{lot.name}</span>
                            {lot.hasEVCharger && <span className="badge badge-warning badge-xs gap-1"><i className="fa-solid fa-bolt text-[8px]" />{' '}EV</span>}
                            {lot.hasAccessible && <span className="badge badge-info badge-xs gap-1"><i className="fa-solid fa-wheelchair text-[8px]" />{' '}Acessível</span>}
                            {lot.is24h && <span className="badge badge-primary badge-xs">24h</span>}
                          </div>
                          <p className="text-xs text-base-content/60 mt-0.5 truncate">
                            <i className="fa-solid fa-location-dot mr-1" />
                            {lot.address}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className={`text-xs font-semibold ${availabilityClass(lot.availableSpots)}`}>
                              <i className="fa-solid fa-circle text-[6px] mr-1 align-middle" />
                              {lot.availableSpots} livres
                            </span>
                            <span className="text-xs text-base-content/50">{lot.distance}</span>
                            <span className="text-xs text-base-content/50"><i className="fa-solid fa-person-walking mr-0.5" /> {lot.walkingTime}</span>
                          </div>
                          <div className="w-full bg-base-300 rounded-full h-1 mt-2">
                            <div
                              className={`h-1 rounded-full transition-all ${occupancyClass(pct)}`}
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

      <div className="card bg-base-200 shadow-md">
        <div className="card-body p-4">
          <h2 className="font-semibold text-base-content text-lg mb-3">
            <i className="fa-solid fa-clock text-primary mr-2" />
            Data & Horário
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="form-control">
              <label className="label pb-1" htmlFor="arrival-input">
                <span className="label-text font-medium text-base-content text-sm">
                  <i className="fa-solid fa-calendar-day mr-1.5 text-primary" />
                  Data e hora de chegada
                </span>
              </label>
              <input
                id="arrival-input"
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
