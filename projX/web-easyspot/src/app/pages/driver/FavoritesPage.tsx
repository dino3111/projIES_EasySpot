import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import type { ParkingLot } from '../../data/parkingTypes';
import { CompactParkRow } from './components/CompactParkRow';
import { fetchFavoriteParks, haversineKm, formatDistance, formatWalkingTime, subscribeSpaceAvailableAlerts } from '../../services/parksApi';

function enrichWithDistance(
  lots: ParkingLot[],
  coords: { lat: number; lng: number },
): ParkingLot[] {
  return lots.map((lot) => {
    const km = haversineKm(coords.lat, coords.lng, lot.latitude, lot.longitude);
    return { ...lot, distance: formatDistance(km), walkingTime: formatWalkingTime(km) };
  });
}

export function FavoritesPage() {
  const [favorites, setFavorites] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscribingAll, setSubscribingAll] = useState(false);
  const [subscribeMessage, setSubscribeMessage] = useState<string | null>(null);
  const userCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        userCoordsRef.current = coords;
        setFavorites((prev) => prev.length > 0 ? enrichWithDistance(prev, coords) : prev);
      },
      () => { /* permission denied — keep N/D */ },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchFavoriteParks();
        if (!mounted) return;
        const coords = userCoordsRef.current;
        setFavorites(coords ? enrichWithDistance(data, coords) : data);
      } catch {
        if (mounted) setError('Não foi possível carregar os favoritos.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-5 h-full transition-colors duration-300">
      <div className="mb-5">
        <h1
          className="text-foreground"
          style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.2 }}
        >
          Favoritos
        </h1>
        <p className="text-muted-foreground mt-1" style={{ fontSize: '0.875rem' }}>
          Os seus parques guardados
        </p>
      </div>

      {loading && <p className="text-muted-foreground text-sm mb-3">A carregar favoritos...</p>}
      {error && <p className="text-error text-sm mb-3">{error}</p>}

      {!loading && favorites.length > 0 && (
        <section aria-label="Lista de favoritos">
          <div className="mb-3 flex items-center gap-2">
            <button
              className="btn btn-sm btn-outline"
              disabled={subscribingAll}
              onClick={async () => {
                try {
                  setSubscribingAll(true);
                  setSubscribeMessage(null);
                  await subscribeSpaceAvailableAlerts(favorites.map((f) => f.id));
                  setSubscribeMessage('Alertas ativados para os seus favoritos.');
                } catch {
                  setSubscribeMessage('Não foi possível ativar alertas para favoritos.');
                } finally {
                  setSubscribingAll(false);
                }
              }}
            >
              <i className="fas fa-bell" aria-hidden="true" /> Alertar-me dos favoritos
            </button>
            {subscribeMessage && <span className="text-xs text-muted-foreground">{subscribeMessage}</span>}
          </div>
          <ul className="space-y-2">
            {favorites.map((lot) => (
              <li key={lot.id}>
                <CompactParkRow lot={lot} filterMode={null} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {!loading && favorites.length === 0 && (
        <section
          className="flex flex-col items-center justify-center rounded-2xl py-16 px-6 text-center bg-card border-2 border-dashed border-border"
          aria-label="Nenhum favorito guardado"
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-4 bg-primary/10"
            aria-hidden="true"
          >
            <i className="fas fa-star text-primary" style={{ fontSize: '2rem' }}></i>
          </div>
          <h2 className="text-foreground font-bold mb-2" style={{ fontSize: '1.1rem' }}>
            Sem favoritos ainda
          </h2>
          <p className="text-muted-foreground max-w-xs leading-relaxed mb-6" style={{ fontSize: '0.875rem' }}>
            Guarde os seus parques preferidos para acesso rápido. Toque na estrela{' '}
            <i className="fas fa-star mx-1 text-warning" aria-hidden="true"></i>{' '}
            na página de detalhe de qualquer parque.
          </p>
          <Link
            to="/"
            className="btn btn-primary rounded-xl px-6 font-bold no-underline"
            aria-label="Explorar parques disponíveis"
          >
            <i className="fas fa-magnifying-glass" aria-hidden="true"></i>
            Explorar Parques
          </Link>
        </section>
      )}

      {/* Dica */}
      <aside
        className="flex items-start gap-3 rounded-xl p-4 mt-4 bg-card border border-border"
      >
        <i className="fas fa-lightbulb mt-0.5 flex-shrink-0 text-warning" aria-hidden="true"></i>
        <div>
          <p className="text-foreground font-bold mb-0.5" style={{ fontSize: '0.8rem' }}>
            Dica
          </p>
          <p className="text-muted-foreground leading-relaxed" style={{ fontSize: '0.78rem' }}>
            Ao guardar parques como favoritos, receberá notificações quando a disponibilidade mudar
            e poderá reservar mais rapidamente.
          </p>
        </div>
      </aside>
    </div>
  );
}
