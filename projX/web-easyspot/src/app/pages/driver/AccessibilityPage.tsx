import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  fetchAllAccessibleSpots,
  type AccessibleSpotDetail,
  type AccessibleSpotsResult,
} from '../../services/accessibilityApi';

// ── Helpers ───────────────────────────────────────────────────────────────────
function getProximityLabel(meters: number): string {
  if (meters <= 20) return 'Muito Perto';
  if (meters <= 40) return 'Perto';
  return 'Médio';
}

function getProximityBadge(meters: number): string {
  if (meters <= 20) return 'badge-success';
  if (meters <= 40) return 'badge-info';
  return 'badge-warning';
}

function getBayCategory(baySize: string): { label: string; cls: string } {
  const match = /^([\d.]+)/.exec(baySize);
  const width = match ? Number.parseFloat(match[1]) : 0;
  if (width >= 4) return { label: 'Amplo', cls: 'text-success' };
  if (width >= 3.5) return { label: 'Standard', cls: 'text-info' };
  if (width > 0) return { label: 'Compacto', cls: 'text-warning' };
  return { label: baySize || '—', cls: 'text-base-content' };
}

// ── Spot Card ─────────────────────────────────────────────────────────────────
function SpotCard({ spot }: Readonly<{ spot: AccessibleSpotDetail }>) {
  const navigate = useNavigate();
  const proximity = getProximityLabel(spot.distanceToEntranceMeters);
  const proximityBadge = getProximityBadge(spot.distanceToEntranceMeters);
  const bay = getBayCategory(spot.baySize);

  return (
    <div
      className={`card bg-base-200 shadow-lg border-2 transition-all hover:shadow-xl ${
        spot.available ? 'border-success/30' : 'border-base-300'
      }`}
    >
      <div className="card-body p-5">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                spot.available ? 'bg-success/20' : 'bg-base-300'
              }`}
            >
              <i
                className={`fa-solid fa-wheelchair text-2xl ${
                  spot.available ? 'text-success' : 'text-base-content/40'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-bold text-base-content text-lg">{spot.location}</h3>
                {spot.available ? (
                  <span className="badge badge-success badge-sm gap-1">
                    <i className="fa-solid fa-circle-check" />{' '}Disponível
                  </span>
                ) : (
                  <span className="badge badge-error badge-sm gap-1">
                    <i className="fa-solid fa-ban" />{' '}Ocupado
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

          <span className={`badge ${proximityBadge} gap-1`}>
            <i className="fa-solid fa-map-pin" />
            {proximity}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <div className="bg-base-100 rounded-xl p-3 border border-base-300">
            <div className="flex items-center gap-2 mb-1">
              <i className="fa-solid fa-door-open text-info" />
              <p className="text-xs text-base-content/60">Distância à Entrada</p>
            </div>
            <p className="font-bold text-base-content">{spot.distanceToEntranceMeters}m</p>
          </div>

          <div className="bg-base-100 rounded-xl p-3 border border-base-300">
            <div className="flex items-center gap-2 mb-1">
              <i className="fa-solid fa-arrows-left-right text-info" />
              <p className="text-xs text-base-content/60">Dimensão</p>
            </div>
            <p className={`font-bold ${bay.cls}`}>{bay.label}</p>
            {spot.baySize ? (
              <p className="text-xs text-base-content/50">{spot.baySize}</p>
            ) : null}
          </div>

          <div className="bg-base-100 rounded-xl p-3 border border-base-300">
            <div className="flex items-center gap-2 mb-1">
              <i className="fa-solid fa-building text-info" />
              <p className="text-xs text-base-content/60">Parque</p>
            </div>
            <p className="font-bold text-base-content text-xs truncate">{spot.parkingLotName}</p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {spot.available && (
            <button
              onClick={() =>
                navigate(`/reservation?parkId=${spot.parkingLotId}`)
              }
              className="btn btn-success btn-sm rounded-full flex-1 sm:flex-none"
            >
              <i className="fa-solid fa-bookmark mr-1" />{' '}Reservar Lugar
            </button>
          )}
          <button
            onClick={() => navigate(`/parking/${spot.parkingLotId}`)}
            className="btn btn-outline btn-primary btn-sm rounded-full flex-1 sm:flex-none"
          >
            <i className="fa-solid fa-map-location-dot mr-1" />{' '}Ver Parque
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function AccessibilityPage() {
  const navigate = useNavigate();
  const [result, setResult] = useState<AccessibleSpotsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterAvailable, setFilterAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAllAccessibleSpots()
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível carregar os lugares acessíveis. Tente novamente.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const spots = result?.spots ?? [];
  const filteredSpots = filterAvailable ? spots.filter((s) => s.available) : spots;

  const avgDistance =
    spots.length > 0
      ? (spots.reduce((acc, s) => acc + s.distanceToEntranceMeters, 0) / spots.length).toFixed(0)
      : '—';

  return (
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-info/20 to-info/10 border-b border-base-300 px-4 md:px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-3xl font-bold text-base-content flex items-center gap-3">
                <i className="fa-solid fa-wheelchair text-info" />{' '}Lugares Acessíveis
              </h1>
              <p className="text-base-content/60 text-sm mt-1.5">
                Lugares de estacionamento adaptados para pessoas com mobilidade reduzida
              </p>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="btn btn-ghost btn-sm rounded-full border border-base-300"
            >
              <i className="fa-solid fa-arrow-left mr-1" />{' '}Voltar
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
                para prevenir utilização não autorizada.
              </p>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <output className="flex justify-center items-center py-16" aria-busy="true">
              <span className="loading loading-spinner loading-lg text-info" />
            </output>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="alert alert-error rounded-2xl mb-6">
              <i className="fa-solid fa-triangle-exclamation" />
              <span>{error}</span>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  fetchAllAccessibleSpots()
                    .then(setResult)
                    .catch(() => setError('Não foi possível carregar os lugares acessíveis.'))
                    .finally(() => setLoading(false));
                }}
              >
                Tentar novamente
              </button>
            </div>
          )}

          {!loading && !error && result && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {([
                  { icon: 'fa-wheelchair', label: 'Disponíveis', value: result.availableCount, bg: 'bg-success/10', text: 'text-success' },
                  { icon: 'fa-building', label: 'Parques com Acessibilidade', value: result.totalParks, bg: 'bg-info/10', text: 'text-info' },
                  { icon: 'fa-list', label: 'Total de Lugares', value: spots.length, bg: 'bg-primary/10', text: 'text-primary' },
                  { icon: 'fa-door-open', label: 'Distância Média', value: `${avgDistance}m`, bg: 'bg-warning/10', text: 'text-warning' },
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

              {/* Empty state */}
              {filteredSpots.length === 0 && (
                <div className="text-center py-16 text-base-content/50">
                  <i className="fa-solid fa-wheelchair text-5xl mb-4" />
                  <p className="text-lg font-semibold">Nenhum lugar encontrado</p>
                  <p className="text-sm mt-1">
                    {filterAvailable
                      ? 'Não há lugares acessíveis disponíveis de momento.'
                      : 'Não existem lugares acessíveis registados.'}
                  </p>
                </div>
              )}

              {/* Spots list */}
              <div className="space-y-4">
                {filteredSpots.map((spot) => (
                  <SpotCard key={spot.id} spot={spot} />
                ))}
              </div>

              {/* Help section */}
              <div className="mt-8 card bg-base-200 shadow-md">
                <div className="card-body p-5">
                  <h3 className="font-semibold text-base-content flex items-center gap-2 mb-3">
                    <i className="fa-solid fa-headset text-primary" />{' '}Precisa de Ajuda?
                  </h3>
                  <p className="text-sm text-base-content/70 mb-4">
                    Se tiver dúvidas sobre as características de acessibilidade ou encontrar algum
                    problema com um lugar adaptado, entre em contacto connosco.
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    <button className="btn btn-primary btn-sm rounded-full">
                      <i className="fa-solid fa-phone mr-2" />{' '}Linha de Apoio
                    </button>
                    <button
                      onClick={() => navigate('/report')}
                      className="btn btn-outline btn-primary btn-sm rounded-full"
                    >
                      <i className="fa-solid fa-flag mr-2" />{' '}Reportar Problema
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
