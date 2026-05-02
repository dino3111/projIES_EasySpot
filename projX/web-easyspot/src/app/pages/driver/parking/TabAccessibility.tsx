import { Link } from 'react-router';
import { getDistanceColor, getSpotDimCategory, type ParkingLot } from '../../../data/parkingData';

export function TabAccessibility({ lot }: { lot: ParkingLot }) {
  if (!lot.accessibleSpots) return null;

  return (
    <div className="animate-in fade-in duration-200">
      <div className="grid grid-cols-1 gap-2.5">
        {[...lot.accessibleSpots]
          .sort((a, b) => (a.available === b.available ? 0 : a.available ? -1 : 1) || a.distanceToEntrance - b.distanceToEntrance)
          .map(spot => {
            const dist = getDistanceColor(spot.distanceToEntrance);
            const dim  = getSpotDimCategory(spot.dimensions);
            return (
              <div
                key={spot.id}
                className={`p-3.5 rounded-xl border flex gap-3 ${spot.available ? 'border-primary/25 bg-primary/4' : 'border-border bg-card'}`}
              >
                <div
                  className="w-14 flex-shrink-0 rounded-xl flex flex-col items-center justify-center gap-0.5 py-2"
                  style={{ background: dist.bg }}
                >
                  <i className="fas fa-door-open text-white" style={{ fontSize: '0.8rem' }} />
                  <span className="text-white font-extrabold leading-none" style={{ fontSize: '0.95rem' }}>
                    {spot.distanceToEntrance}m
                  </span>
                  <span className="text-white/80 font-medium" style={{ fontSize: '0.55rem', textAlign: 'center' }}>entrada</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1.5">
                    <p className="font-bold text-foreground truncate pr-2" style={{ fontSize: '0.85rem' }}>{spot.zone}</p>
                    <span
                      className="flex-shrink-0 px-2 py-0.5 rounded-full text-white font-bold"
                      style={{ fontSize: '0.68rem', background: spot.available ? '#22c55e' : '#ef4444' }}
                    >
                      {spot.available ? 'Livre' : 'Ocupado'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold border ${dim.bgClass} ${dim.textClass}`}
                      style={{ fontSize: '0.7rem', borderColor: 'currentColor' }}
                    >
                      <i className={`fas ${dim.icon}`} style={{ fontSize: '0.6rem' }} />
                      {dim.label} — {spot.dimensions}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    <span className="flex items-center gap-1" style={{ fontSize: '0.72rem' }}>
                      <i className={spot.hasRampSpace ? 'fas fa-check text-success' : 'fas fa-times text-error'} />
                      <span className="text-muted-foreground">Espaço rampa</span>
                    </span>
                    <span className="flex items-center gap-1" style={{ fontSize: '0.72rem' }}>
                      <i className={spot.monitored ? 'fas fa-video text-primary' : 'fas fa-video-slash text-muted-foreground'} />
                      <span className="text-muted-foreground">{spot.monitored ? 'Vigiado' : 'Sem câmara'}</span>
                    </span>
                    <span className="flex items-center gap-1" style={{ fontSize: '0.72rem' }}>
                      <i className={`fas fa-circle ${spot.sensorStatus === 'online' ? 'text-success' : 'text-warning'}`} style={{ fontSize: '0.5rem' }} />
                      <span className="text-muted-foreground">Sensor {spot.sensorStatus === 'online' ? 'online' : 'avariado'}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      <div className="mt-3 p-3 bg-muted/30 border border-border rounded-xl">
        <p className="text-muted-foreground font-semibold mb-2" style={{ fontSize: '0.72rem' }}>Legenda</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <div>
            <p className="text-muted-foreground font-semibold mb-1" style={{ fontSize: '0.65rem' }}>DISTÂNCIA À ENTRADA</p>
            {[
              { color: '#22c55e', label: '≤ 20m — Muito próximo' },
              { color: '#f59e0b', label: '21–40m — Intermédio' },
              { color: '#ef4444', label: '> 40m — Afastado' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 mb-0.5">
                <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: item.color }} />
                <span className="text-foreground" style={{ fontSize: '0.68rem' }}>{item.label}</span>
              </div>
            ))}
          </div>
          <div>
            <p className="text-muted-foreground font-semibold mb-1" style={{ fontSize: '0.65rem' }}>DIMENSÃO DO LUGAR</p>
            {[
              { cls: 'text-success', label: 'Amplo — Largura ≥ 4.0m' },
              { cls: 'text-info',    label: 'Standard — 3.5m a 3.9m' },
              { cls: 'text-warning', label: 'Compacto — < 3.5m' },
            ].map((item) => (
              <p key={item.label} className={`font-semibold ${item.cls}`} style={{ fontSize: '0.68rem' }}>{item.label}</p>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 p-4 bg-warning/5 border border-warning/30 rounded-xl">
        <div className="flex items-start gap-3 mb-3">
          <i className="fas fa-triangle-exclamation text-warning text-lg mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-foreground text-sm">Detetou uma ocupação irregular?</p>
            <p className="text-xs text-muted-foreground mt-1">Ajude-nos a manter os lugares acessíveis disponíveis para quem realmente precisa.</p>
          </div>
        </div>
        <Link to={`/report?parkId=${lot.id}`} className="btn btn-warning btn-sm rounded-full w-full">
          <i className="fas fa-flag mr-2" />
          Reportar Estacionamento Não Autorizado
        </Link>
      </div>
    </div>
  );
}
