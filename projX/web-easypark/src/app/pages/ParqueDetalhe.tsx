import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import {
  mockParkingLots,
  simulateRealTimeUpdate,
  type ParkingLot,
  type ParkingFloor,
  type SpotStatus,
} from '../data/parkingData';
import { LeafletMap } from '../components/LeafletMap';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

type Tab = 'geral' | 'mapa' | 'ev' | 'acessibilidade' | 'tarifas';

export function ParqueDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [lot, setLot] = useState<ParkingLot | null>(
    () => mockParkingLots.find((l) => l.id === id) ?? null
  );
  const [activeTab, setActiveTab] = useState<Tab>('geral');
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeFloorIdx, setActiveFloorIdx] = useState(0);

  useEffect(() => {
    if (!lot) return;
    const interval = setInterval(() => {
      setLot((prev) => (prev ? simulateRealTimeUpdate(prev) : prev));
    }, 5000);
    return () => clearInterval(interval);
  }, [lot?.id]);

  if (!lot) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center bg-background">
        <i className="fas fa-circle-exclamation text-muted-foreground text-5xl mb-4" aria-hidden="true" />
        <h1 className="text-xl font-bold text-foreground">Parque não encontrado</h1>
        <p className="text-muted-foreground text-sm mt-2 mb-6">O parque que procura não existe ou foi removido.</p>
        <Link to="/" className="btn btn-primary rounded-full px-6 text-sm">
          <i className="fas fa-arrow-left mr-2" aria-hidden="true" />
          Voltar à lista
        </Link>
      </div>
    );
  }

  const occupied = lot.totalSpots - lot.availableSpots;
  const occupancyPct = lot.totalSpots > 0 ? Math.round((occupied / lot.totalSpots) * 100) : 0;
  const isFull = lot.availableSpots === 0;
  const isAlmostFull = !isFull && lot.availableSpots <= Math.ceil(lot.totalSpots * 0.2);

  const statusHex   = isFull ? '#ef4444'          : isAlmostFull ? '#f59e0b'      : '#22c55e';
  const statusLabel = isFull ? 'Lotado' : isAlmostFull ? 'Quase cheio' : 'Disponível';

  const availableEV  = lot.evChargers?.filter((c) => c.available).length ?? 0;
  const totalEV      = lot.evChargers?.length ?? 0;
  const availableAcc = lot.accessibleSpots?.filter((s) => s.available).length ?? 0;
  const totalAcc     = lot.accessibleSpots?.length ?? 0;

  const activeFloor: ParkingFloor | undefined = lot.floors?.[activeFloorIdx];

  const tabs: { id: Tab; icon: string; label: string; short: string }[] = [
    { id: 'geral',          icon: 'fa-info-circle',      label: 'Geral',        short: 'Geral' },
    ...(lot.floors?.length             ? [{ id: 'mapa' as Tab,          icon: 'fa-map',              label: 'Mapa',          short: 'Mapa' }] : []),
    ...(totalEV > 0                    ? [{ id: 'ev' as Tab,            icon: 'fa-charging-station', label: 'Carregamento EV', short: 'EV' }] : []),
    ...(totalAcc > 0                   ? [{ id: 'acessibilidade' as Tab, icon: 'fa-wheelchair',      label: 'Acessibilidade', short: 'Acess.' }] : []),
    { id: 'tarifas',        icon: 'fa-euro-sign',        label: 'Tarifas',      short: 'Tarifas' },
  ];

  return (
    <div className="w-full max-w-[1200px] mx-auto p-3 lg:p-5 min-h-[calc(100vh-56px)] bg-background font-sans overscroll-y-auto">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        
        {/* COLUNA ESQUERDA */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          
          {/* Card Hero */}
          <div className="rounded-2xl overflow-hidden shadow-lg" style={{ background: 'linear-gradient(135deg, #7357ec 0%, #4a3696 100%)' }}>
            <div className="flex items-start justify-between p-4 pb-1">
              <button 
                onClick={() => navigate(-1)} 
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <i className="fas fa-arrow-left text-sm" />
              </button>
              <button
                onClick={() => setIsFavorite((v) => !v)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  isFavorite ? 'bg-warning text-white shadow-md shadow-warning/30' : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
                }`}
              >
                <i className="fas fa-star text-sm" />
              </button>
            </div>

            <div className="px-5 pb-5 text-white">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="px-2 py-0.5 rounded text-xs uppercase font-bold" style={{ background: statusHex, color: '#fff' }}>
                  {statusLabel}
                </span>
                {lot.is24h && <span className="px-2 py-0.5 rounded bg-white/20 text-xs font-bold text-white">24H</span>}
              </div>
              <h1 className="text-2xl font-bold leading-tight mb-1 truncate">{lot.name}</h1>
              <p className="text-white/80 text-sm flex items-center gap-1.5 truncate">
                <i className="fas fa-location-dot" />
                {lot.address}
              </p>
            </div>

            <div className="mx-4 mb-4 rounded-xl bg-white/10 backdrop-blur-sm p-3">
              <div className="flex justify-between items-end mb-1">
                <div>
                  <p className="text-white/60 text-xs uppercase font-bold mb-0.5">Livres</p>
                  <p className="text-3xl font-black text-white leading-none">{lot.availableSpots}</p>
                </div>
                <div className="text-right">
                  <p className="text-white/80 text-xs font-semibold mb-0.5">de {lot.totalSpots}</p>
                  <p className="text-white text-lg font-bold" style={{ color: statusHex }}>{occupancyPct}%</p>
                </div>
              </div>
            </div>
            
            <div className="px-4 pb-4 mt-1">
              <button
                className={`w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-[0.98] ${
                  isFull ? 'bg-black/20 text-white/50 cursor-not-allowed' : 'bg-white text-primary hover:bg-gray-50 shadow-md'
                }`}
                disabled={isFull}
              >
                <i className={`fas ${isFull ? 'fa-ban' : 'fa-calendar-check'}`} />
                {isFull ? 'Lotado' : 'Reservar'}
              </button>
            </div>
          </div>

          {/* Info Grid Rápida */}
          <div className="grid grid-cols-2 gap-3">
            <InfoBox icon="fa-euro-sign" label="Hora" value={`€${lot.hourlyRate.toFixed(2)}`} color="text-primary" />
            <InfoBox icon="fa-person-walking" label="Pé" value={lot.walkingTime} color="text-primary" />
            <InfoBox icon="fa-clock" label="Horário" value={lot.is24h ? '24h' : lot.openingHours} color="text-primary" />
            <InfoBox icon="fa-route" label="Dist." value={lot.distance} color="text-primary" />
          </div>

          {/* Comodidades */}
          {(lot.amenities.length > 0 || totalEV > 0 || totalAcc > 0) && (
            <div className="bg-card rounded-xl p-4 border border-border">
              <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">Comodidades</h3>
              <div className="flex flex-wrap gap-1.5">
                {totalEV > 0 && (
                  <span className={`px-2 py-1 rounded text-sm font-semibold ${availableEV > 0 ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}>
                    <i className="fas fa-charging-station mr-1" /> {availableEV}/{totalEV} EV
                  </span>
                )}
                {totalAcc > 0 && (
                  <span className={`px-2 py-1 rounded text-sm font-semibold ${availableAcc > 0 ? 'bg-info/15 text-info' : 'bg-muted text-muted-foreground'}`}>
                    <i className="fas fa-wheelchair mr-1" /> {availableAcc} Acess.
                  </span>
                )}
                {lot.amenities.map(a => (
                  <span key={a} className="px-2 py-1 rounded text-sm font-medium bg-muted text-muted-foreground border border-border">
                    <i className={`fas ${amenityIcon(a)} mr-1 opacity-70`} /> {amenityLabel(a)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* COLUNA DIREITA */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          
          <div className="rounded-2xl overflow-hidden h-[180px] md:h-[220px] border border-border shadow-sm relative">
            <LeafletMap lots={[lot]} selectedId={lot.id} singleLot={lot} height="100%" />
            <a
              href={`https://www.openstreetmap.org/directions?from=&to=${lot.latitude},${lot.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-3 right-3 bg-primary text-white px-3 py-2 rounded-lg text-sm font-bold shadow-md flex items-center gap-1.5 hover:scale-105 transition-transform z-[400]"
            >
              <i className="fas fa-location-arrow" /> Navegar
            </a>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm flex flex-col flex-1 pb-4">
            
            <div className="border-b border-border w-full overflow-hidden">
              <div className="flex w-full">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-3 px-1 text-center font-bold text-xs sm:text-sm transition-colors border-b-2 whitespace-nowrap ${
                      activeTab === tab.id 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    <i className={`fas ${tab.icon} md:mr-1 block md:inline mb-0.5 md:mb-0`} />
                    <span className="block md:inline">{tab.short}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 sm:p-5 flex-1">
              
              {/* === GERAL === */}
              {activeTab === 'geral' && (
                <div className="animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row gap-4 items-center mb-6 bg-muted/40 p-4 rounded-xl border border-border">
                    <div className="w-[120px] h-[120px] relative flex-shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Livres', value: lot.availableSpots },
                              { name: 'Ocupados', value: occupied },
                            ]}
                            cx="50%" cy="50%"
                            innerRadius={30} outerRadius={50}
                            dataKey="value" stroke="none"
                            startAngle={90} endAngle={-270}
                            isAnimationActive={false}
                          >
                            <Cell fill="#22c55e" />
                            <Cell fill={isFull ? '#ef4444' : isAlmostFull ? '#f59e0b' : 'var(--muted)'} />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-bold text-foreground text-lg">{occupancyPct}%</span>
                      </div>
                    </div>
                    <div className="flex-1 w-full space-y-2">
                      <h3 className="font-bold text-sm text-foreground mb-1">Taxa de Ocupação</h3>
                      <div className="flex justify-between items-center bg-card p-2 rounded-lg border border-border">
                        <div className="flex gap-2 items-center"><span className="w-2.5 h-2.5 rounded-sm bg-success"/><span className="text-sm font-semibold text-foreground">Livres</span></div>
                        <span className="text-sm font-bold text-success">{lot.availableSpots}</span>
                      </div>
                      <div className="flex justify-between items-center bg-card p-2 rounded-lg border border-border">
                        <div className="flex gap-2 items-center"><span className="w-2.5 h-2.5 rounded-sm" style={{background: statusHex}}/><span className="text-sm font-semibold text-foreground">Ocupados</span></div>
                        <span className="text-sm font-bold" style={{color: statusHex}}>{occupied}</span>
                      </div>
                      <p className="text-xs text-muted-foreground text-right mt-1">{lot.totalSpots} lugares disponíveis</p>
                    </div>
                  </div>

                  {lot.zones && lot.zones.length > 0 && (
                    <div>
                      <h3 className="font-bold text-foreground mb-3 text-sm">Zonas</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {lot.zones.map((zone) => {
                          const zPct = Math.round(((zone.totalSpots - zone.availableSpots) / zone.totalSpots) * 100);
                          const zHex = zone.availableSpots === 0 ? '#ef4444' : zPct > 80 ? '#f59e0b' : '#22c55e';
                          return (
                            <div key={zone.id} className="p-3 rounded-xl bg-card border border-border flex items-center gap-3">
                              <ZoneTypeBadge type={zone.type} />
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-end mb-1">
                                  <p className="font-bold text-sm text-foreground truncate">{zone.name}</p>
                                  <p className="text-sm font-bold" style={{ color: zHex }}>{zone.availableSpots}<span className="text-xs text-muted-foreground font-medium">/{zone.totalSpots}</span></p>
                                </div>
                                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${zPct}%`, background: zHex }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* === MAPA INTERNO === */}
              {activeTab === 'mapa' && (
                <div className="animate-in fade-in duration-200">
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {lot.floors?.map((floor, idx) => (
                      <button
                        key={floor.id}
                        onClick={() => setActiveFloorIdx(idx)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all border ${
                          activeFloorIdx === idx 
                          ? 'bg-primary text-primary-foreground border-primary' 
                          : 'bg-card text-muted-foreground border-border hover:bg-muted'
                        }`}
                      >
                        {floor.name}
                      </button>
                    ))}
                  </div>

                  {activeFloor && (
                     <div className="rounded-xl border border-border bg-card overflow-hidden">
                       <div className="p-3 bg-muted/30 border-b border-border flex justify-between items-center flex-wrap gap-2 text-sm">
                         <span className="font-bold text-foreground">Planta do {activeFloor.name}</span>
                         <div className="flex gap-2">
                           <MapLegend hex="#22c55e" label="Livre" />
                           <MapLegend hex="#ef4444" label="Ocup." />
                           <MapLegend hex="#7357ec" label="EV" />
                           <MapLegend hex="#0ea5e9" label="Acess." />
                         </div>
                       </div>
                       <div className="p-4 overflow-x-auto scrollbar-none flex justify-center bg-muted/10 overscroll-x-contain">
                         <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${activeFloor.cols}, 35px)` }}>
                            {activeFloor.spots.map((spot) => <SpotCell key={spot.id} spot={spot} />)}
                         </div>
                       </div>
                     </div>
                  )}
                </div>
              )}

              {/* === EV === */}
              {activeTab === 'ev' && lot.evChargers && (
                <div className="animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                     {lot.evChargers.map((c, i) => (
                       <div key={c.id} className="p-3 rounded-xl border border-border bg-card flex gap-3 items-center">
                         <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm flex-shrink-0">
                           <i className={`fas ${c.type === 'Tesla Supercharger' ? 'fa-bolt' : 'fa-plug'}`} />
                         </div>
                         <div className="flex-1 min-w-0">
                           <div className="flex justify-between items-start mb-0.5">
                             <p className="font-bold text-sm text-foreground truncate">{c.type}</p>
                             <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${c.available ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
                               {c.available ? 'Livre' : 'Ocupado'}
                             </span>
                           </div>
                           <p className="text-muted-foreground text-xs font-medium">{c.speedKW} kW • {c.speed}</p>
                           <p className="text-primary font-bold text-sm mt-1">€{c.price.toFixed(2)}<span className="opacity-60 font-normal">/kWh</span></p>
                         </div>
                       </div>
                     ))}
                  </div>
                </div>
              )}

              {/* === ACESSIBILIDADE === */}
              {activeTab === 'acessibilidade' && lot.accessibleSpots && (
                <div className="animate-in fade-in duration-200">
                   <div className="grid grid-cols-1 gap-2">
                      {[...lot.accessibleSpots].sort((a,b) => (a.available === b.available ? 0 : a.available ? -1 : 1) || a.distanceToEntrance - b.distanceToEntrance).map(spot => (
                        <div key={spot.id} className={`p-3 rounded-xl border ${spot.available ? 'border-info/30 bg-info/5' : 'border-border bg-card'} flex gap-3 items-center`}>
                          <div className={`w-10 h-10 rounded-lg flex flex-col justify-center items-center font-bold flex-shrink-0 ${spot.distanceToEntrance <= 20 ? 'bg-success text-white' : 'bg-warning text-warning-foreground'}`}>
                            <span className="text-sm leading-none">{spot.distanceToEntrance}m</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                              <p className="font-bold text-sm text-foreground">{spot.zone}</p>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${spot.available ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
                                {spot.available ? 'Livre' : 'Ocup.'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              <span className="text-xs text-muted-foreground"><i className={spot.hasRampSpace ? "fas fa-check text-success" : "fas fa-times text-destructive"}/> Rampa</span>
                              <span className="text-xs text-muted-foreground"><i className={spot.monitored ? "fas fa-video text-primary" : "fas fa-video-slash"}/> {spot.monitored ? 'Vigiado' : 'S/ Câmera'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                   </div>
                </div>
              )}

              {/* === TARIFAS === */}
              {activeTab === 'tarifas' && (
                <div className="animate-in fade-in duration-200">
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
                        <p className="font-bold text-sm text-foreground">€{lot.dailyMax.toFixed(2)}</p>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-xl bg-card border border-border">
                        <div>
                          <p className="font-bold text-sm text-foreground">Passe Mensal</p>
                          <p className="text-muted-foreground text-xs">Acesso 24/7</p>
                        </div>
                        <p className="font-bold text-sm text-foreground">€{lot.monthlyRate.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function InfoBox({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div className="bg-card rounded-xl p-3 border border-border flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 ${color}`}>
        <i className={`fas ${icon} text-sm`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase font-bold text-muted-foreground mb-0.5">{label}</p>
        <p className="text-sm font-bold text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

function MapLegend({ hex, label }: { hex: string, label: string }) {
  return <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{background: hex}}/><span className="text-xs text-muted-foreground">{label}</span></div>;
}

function SpotCell({ spot }: { spot: import('../data/parkingData').ParkingSpot }) {
  const palette: Record<SpotStatus, string> = {
    free: '#22c55e', occupied: '#ef4444', reserved: '#f59e0b', ev: '#7357ec', accessible: '#0ea5e9'
  };
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg shadow-sm"
      style={{ width: 35, height: 45, background: palette[spot.status] }}
    >
      <i className={`fas ${spot.status === 'free' ? 'fa-square-parking' : spot.status === 'ev' ? 'fa-charging-station' : spot.status === 'accessible' ? 'fa-wheelchair' : 'fa-car'} text-white/90 text-xs`} />
      {spot.label && <span className="text-white font-bold mt-0.5 text-[10px]">{spot.label}</span>}
    </div>
  );
}

function ZoneTypeBadge({ type }: { type: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    ev: { label: 'EV', cls: 'bg-primary/20 text-primary' },
    accessible: { label: 'Acessível', cls: 'bg-info/20 text-info' },
    standard: { label: 'Geral', cls: 'bg-muted text-muted-foreground' }
  };
  const c = cfg[type] || cfg.standard;
  return <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.cls}`}>{c.label}</span>;
}

function amenityIcon(a: string) { return { security: 'fa-shield-halved', covered: 'fa-warehouse', elevator: 'fa-elevator', toilets: 'fa-restroom', 'ev-charging': 'fa-charging-station', accessible: 'fa-wheelchair', 'bike-rack': 'fa-bicycle', cctv: 'fa-video' }[a] || 'fa-check'; }
function amenityLabel(a: string) { return { security: 'Seg.', covered: 'Cob.', elevator: 'Elev.', toilets: 'WC', 'ev-charging': 'EV', accessible: 'Acess.', 'bike-rack': 'Bici.', cctv: 'CCTV' }[a] || a; }