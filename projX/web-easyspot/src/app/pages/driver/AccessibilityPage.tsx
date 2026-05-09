import { useState } from 'react';
import { useNavigate } from 'react-router';

// ── Types ─────────────────────────────────────────────────────────────────────
interface AccessibleSpot {
  id: string;
  parkingLotName: string;
  parkingLotAddress: string;
  spotLabel: string;
  distance: number; // metros até à entrada
  width: number; // largura em metros
  hasRamp: boolean;
  hasElevator: boolean;
  proximityToEntrance: 'muito_perto' | 'perto' | 'medio';
  isMonitored: boolean;
  isAvailable: boolean;
  features: string[];
  lastChecked: string;
}

// ── Mock Data ─────────────────────────────────────────────────────────────────
const mockSpots: AccessibleSpot[] = [
  {
    id: 'ACC-001',
    parkingLotName: 'Parque Amoreiras',
    parkingLotAddress: 'Av. Eng. Duarte Pacheco, Lisboa',
    spotLabel: 'A-01',
    distance: 8,
    width: 3.5,
    hasRamp: true,
    hasElevator: true,
    proximityToEntrance: 'muito_perto',
    isMonitored: true,
    isAvailable: true,
    features: ['Rampa de acesso', 'Elevador adaptado', 'Piso tátil', 'Iluminação reforçada'],
    lastChecked: '2026-03-10T12:00:00',
  },
  {
    id: 'ACC-002',
    parkingLotName: 'Parque El Corte Inglés',
    parkingLotAddress: 'Av. António Augusto de Aguiar, Lisboa',
    spotLabel: 'B-03',
    distance: 12,
    width: 3.8,
    hasRamp: true,
    hasElevator: true,
    proximityToEntrance: 'perto',
    isMonitored: true,
    isAvailable: false,
    features: ['Rampa de acesso', 'Elevador adaptado', 'Intercomunicador', 'Videovigilância'],
    lastChecked: '2026-03-10T11:45:00',
  },
  {
    id: 'ACC-003',
    parkingLotName: 'Parque Marquês de Pombal',
    parkingLotAddress: 'Praça Marquês de Pombal, Lisboa',
    spotLabel: 'C-02',
    distance: 15,
    width: 3.3,
    hasRamp: true,
    hasElevator: false,
    proximityToEntrance: 'perto',
    isMonitored: true,
    isAvailable: true,
    features: ['Rampa de acesso', 'Piso tátil', 'Sinalização em Braille'],
    lastChecked: '2026-03-10T12:10:00',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getProximityLabel(proximity: string): string {
  switch (proximity) {
    case 'muito_perto':
      return 'Muito Perto';
    case 'perto':
      return 'Perto';
    case 'medio':
      return 'Médio';
    default:
      return proximity;
  }
}

function getProximityColor(proximity: string): string {
  switch (proximity) {
    case 'muito_perto':
      return 'badge-success';
    case 'perto':
      return 'badge-info';
    case 'medio':
      return 'badge-warning';
    default:
      return 'badge-neutral';
  }
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function AccessibilityPage() {
  const navigate = useNavigate();
  const [spots] = useState<AccessibleSpot[]>(mockSpots);
  const [filterAvailable, setFilterAvailable] = useState(false);

  const filteredSpots = filterAvailable ? spots.filter(s => s.isAvailable) : spots;

  return (
    <div className="min-h-screen bg-base-100">
      {/* Page header */}
      <div className="bg-gradient-to-r from-info/20 to-info/10 border-b border-base-300 px-4 md:px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-3xl font-bold text-base-content flex items-center gap-3">
                <i className="fa-solid fa-wheelchair text-info" />
                Lugares Acessíveis
              </h1>
              <p className="text-base-content/60 text-sm mt-1.5">
                Lugares de estacionamento adaptados para pessoas com mobilidade reduzida
              </p>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="btn btn-ghost btn-sm rounded-full border border-base-300"
            >
              <i className="fa-solid fa-arrow-left mr-1" />
              Voltar
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          {/* Info banner */}
          <div className="alert bg-info/10 border border-info/20 rounded-2xl mb-6 p-4">
            <i className="fa-solid fa-circle-info text-info text-2xl" />
            <div>
              <p className="font-semibold text-base-content text-sm mb-1">Garantia de Acessibilidade</p>
              <p className="text-base-content/70 text-xs">
                Todos os lugares listados cumprem as normas de acessibilidade e são monitorizados 
                para prevenir utilização não autorizada. As dimensões e características são verificadas regularmente.
              </p>
            </div>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {([
              { icon: 'fa-wheelchair', label: 'Lugares Disponíveis', value: spots.filter(s => s.isAvailable).length, bg: 'bg-success/10', text: 'text-success' },
              { icon: 'fa-building', label: 'Parques com Acessibilidade', value: new Set(spots.map(s => s.parkingLotName)).size, bg: 'bg-info/10', text: 'text-info' },
              { icon: 'fa-video', label: 'Lugares Monitorizados', value: spots.filter(s => s.isMonitored).length, bg: 'bg-primary/10', text: 'text-primary' },
              { icon: 'fa-ruler-combined', label: 'Largura Média', value: `${(spots.reduce((acc, s) => acc + s.width, 0) / spots.length).toFixed(1)}m`, bg: 'bg-warning/10', text: 'text-warning' },
            ] as const).map((stat) => (
              <div key={stat.label} className="card bg-base-200 shadow-md">
                <div className="card-body p-4">
                  <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-2`}>
                    <i className={`fa-solid ${stat.icon} ${stat.text} text-lg`} />
                  </div>
                  <p className="text-base-content/60 text-xs">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.text}`}>{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filter */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-lg font-semibold text-base-content">
              {filteredSpots.length} Lugares Encontrados
            </h2>
            <label className="label cursor-pointer gap-3 bg-base-200 px-4 py-2 rounded-full border border-base-300">
              <span className="label-text text-sm">Apenas disponíveis</span>
              <input
                type="checkbox"
                className="toggle toggle-success"
                checked={filterAvailable}
                onChange={(e) => setFilterAvailable(e.target.checked)}
              />
            </label>
          </div>

          {/* Spots list */}
          <div className="space-y-4">
            {filteredSpots.map((spot) => (
              <div
                key={spot.id}
                className={`card bg-base-200 shadow-lg border-2 transition-all hover:shadow-xl ${
                  spot.isAvailable ? 'border-success/30' : 'border-base-300'
                }`}
              >
                <div className="card-body p-5">
                  <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        spot.isAvailable ? 'bg-success/20' : 'bg-base-300'
                      }`}>
                        <i className={`fa-solid fa-wheelchair text-2xl ${
                          spot.isAvailable ? 'text-success' : 'text-base-content/40'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-bold text-base-content text-lg">
                            Lugar {spot.spotLabel}
                          </h3>
                          {spot.isAvailable ? (
                            <span className="badge badge-success badge-sm gap-1">
                              <i className="fa-solid fa-circle-check" />
                              Disponível
                            </span>
                          ) : (
                            <span className="badge badge-error badge-sm gap-1">
                              <i className="fa-solid fa-ban" />
                              Ocupado
                            </span>
                          )}
                          {spot.isMonitored && (
                            <span className="badge badge-primary badge-sm gap-1">
                              <i className="fa-solid fa-video" />
                              Vigiado
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-base-content text-sm">{spot.parkingLotName}</p>
                        <p className="text-base-content/60 text-xs">
                          <i className="fa-solid fa-location-dot mr-1" />
                          {spot.parkingLotAddress}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`badge ${getProximityColor(spot.proximityToEntrance)} gap-1 mb-2`}>
                        <i className="fa-solid fa-map-pin" />
                        {getProximityLabel(spot.proximityToEntrance)}
                      </span>
                      <p className="text-xs text-base-content/60">
                        Atualizado às {fmtTime(spot.lastChecked)}
                      </p>
                    </div>
                  </div>

                  {/* Características técnicas */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-base-100 rounded-xl p-3 border border-base-300">
                      <div className="flex items-center gap-2 mb-1">
                        <i className="fa-solid fa-arrows-left-right text-info" />
                        <p className="text-xs text-base-content/60">Largura</p>
                      </div>
                      <p className="font-bold text-base-content">{spot.width}m</p>
                    </div>

                    <div className="bg-base-100 rounded-xl p-3 border border-base-300">
                      <div className="flex items-center gap-2 mb-1">
                        <i className="fa-solid fa-door-open text-info" />
                        <p className="text-xs text-base-content/60">Distância à Entrada</p>
                      </div>
                      <p className="font-bold text-base-content">{spot.distance}m</p>
                    </div>

                    <div className="bg-base-100 rounded-xl p-3 border border-base-300">
                      <div className="flex items-center gap-2 mb-1">
                        <i className={`fa-solid fa-up-right-from-square ${spot.hasRamp ? 'text-success' : 'text-base-content/30'}`} />
                        <p className="text-xs text-base-content/60">Rampa</p>
                      </div>
                      <p className={`font-semibold ${spot.hasRamp ? 'text-success' : 'text-base-content/40'}`}>
                        {spot.hasRamp ? 'Sim' : 'Não'}
                      </p>
                    </div>

                    <div className="bg-base-100 rounded-xl p-3 border border-base-300">
                      <div className="flex items-center gap-2 mb-1">
                        <i className={`fa-solid fa-elevator ${spot.hasElevator ? 'text-success' : 'text-base-content/30'}`} />
                        <p className="text-xs text-base-content/60">Elevador</p>
                      </div>
                      <p className={`font-semibold ${spot.hasElevator ? 'text-success' : 'text-base-content/40'}`}>
                        {spot.hasElevator ? 'Sim' : 'Não'}
                      </p>
                    </div>
                  </div>

                  {/* Características adicionais */}
                  <div className="mb-4">
                    <p className="text-xs text-base-content/60 mb-2 font-semibold">Características de Acessibilidade:</p>
                    <div className="flex flex-wrap gap-2">
                      {spot.features.map((feature) => (
                        <span key={feature} className="badge badge-sm badge-outline gap-1">
                          <i className="fa-solid fa-check text-success" />
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    {spot.isAvailable && (
                      <button
                        onClick={() => navigate('/reservation')}
                        className="btn btn-success btn-sm rounded-full flex-1 sm:flex-none"
                      >
                        <i className="fa-solid fa-bookmark mr-1" />
                        Reservar Lugar
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/parking/${spot.id}`)}
                      className="btn btn-outline btn-primary btn-sm rounded-full flex-1 sm:flex-none"
                    >
                      <i className="fa-solid fa-map-location-dot mr-1" />
                      Ver no Mapa
                    </button>
                    <button className="btn btn-ghost btn-sm rounded-full">
                      <i className="fa-solid fa-info-circle" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Help section */}
          <div className="mt-8 card bg-base-200 shadow-md">
            <div className="card-body p-5">
              <h3 className="font-semibold text-base-content flex items-center gap-2 mb-3">
                <i className="fa-solid fa-headset text-primary" />
                Precisa de Ajuda?
              </h3>
              <p className="text-sm text-base-content/70 mb-4">
                Se tiver dúvidas sobre as características de acessibilidade ou encontrar algum problema 
                com um lugar adaptado, entre em contacto connosco.
              </p>
              <div className="flex gap-3 flex-wrap">
                <button className="btn btn-primary btn-sm rounded-full">
                  <i className="fa-solid fa-phone mr-2" />
                  Linha de Apoio
                </button>
                <button
                  onClick={() => navigate('/report')}
                  className="btn btn-outline btn-primary btn-sm rounded-full"
                >
                  <i className="fa-solid fa-flag mr-2" />
                  Reportar Problema
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
