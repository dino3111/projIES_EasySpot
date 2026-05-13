import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface DestinationPoint {
  lat: number;
  lng: number;
  label: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

async function nominatimSearch(query: string): Promise<NominatimResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '5',
    countrycodes: 'pt',
    addressdetails: '0',
  });
  const resp = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { 'Accept-Language': 'pt', 'User-Agent': 'EasySpot/1.0' },
  });
  if (!resp.ok) return [];
  return resp.json() as Promise<NominatimResult[]>;
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lng), format: 'json' });
  const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
    headers: { 'Accept-Language': 'pt', 'User-Agent': 'EasySpot/1.0' },
  });
  if (!resp.ok) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  const data = await resp.json() as { display_name?: string };
  return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function createDestinationIcon(isDark: boolean) {
  const color = isDark ? '#38bdf8' : '#0ea5e9';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 44 44">
      <defs>
        <filter id="dshadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="rgba(0,0,0,0.4)"/>
        </filter>
      </defs>
      <circle cx="22" cy="22" r="15" fill="${color}" stroke="white" stroke-width="3" filter="url(#dshadow)"/>
      <circle cx="22" cy="22" r="4.5" fill="white"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
    className: 'leaflet-destination-icon',
  });
}

interface DestinationPickerProps {
  readonly value: DestinationPoint | null;
  readonly onChange: (point: DestinationPoint | null) => void;
  readonly height?: string;
}

export function DestinationPicker({ value, onChange, height = '260px' }: DestinationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

  const placeMarker = useCallback((lat: number, lng: number, label: string, map: L.Map) => {
    const icon = createDestinationIcon(document.documentElement.classList.contains('dark'));
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]).setIcon(icon);
    } else {
      markerRef.current = L.marker([lat, lng], { icon }).addTo(map);
    }
    onChange({ lat, lng, label });
  }, [onChange]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      zoomSnap: 0.5,
      wheelPxPerZoomLevel: 120,
    });

    const initialCenter: [number, number] = value
      ? [value.lat, value.lng]
      : [39.6, -8.0];
    const initialZoom = value ? 14 : 6;
    map.setView(initialCenter, initialZoom);

    L.tileLayer(tileUrl, { attribution, maxZoom: 20 }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    if (value) {
      placeMarker(value.lat, value.lng, value.label, map);
    }

    map.on('click', async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      const label = await reverseGeocode(lat, lng);
      placeMarker(lat, lng, label, map);
      setSearchQuery(label.split(',')[0] ?? label);
      setSuggestions([]);
      setShowSuggestions(false);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) map.removeLayer(layer);
    });
    L.tileLayer(tileUrl, { attribution, maxZoom: 20 }).addTo(map);
    if (markerRef.current) {
      markerRef.current.setIcon(createDestinationIcon(isDark));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark]);

  const handleSearchInput = (query: string) => {
    setSearchQuery(query);
    setGpsError(null);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!query.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await nominatimSearch(query);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } finally {
        setSearchLoading(false);
      }
    }, 400);
  };

  const handleSuggestionSelect = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const label = result.display_name;
    const map = mapRef.current;
    if (map) {
      placeMarker(lat, lng, label, map);
      map.setView([lat, lng], 14, { animate: true, duration: 0.6 });
    }
    setSearchQuery(label.split(',')[0] ?? label);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocalização não suportada neste browser.');
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const label = await reverseGeocode(lat, lng);
        const map = mapRef.current;
        if (map) {
          placeMarker(lat, lng, label, map);
          map.setView([lat, lng], 15, { animate: true, duration: 0.6 });
        }
        setSearchQuery(label.split(',')[0] ?? label);
        setSuggestions([]);
        setShowSuggestions(false);
        setGpsLoading(false);
      },
      (err) => {
        setGpsError(
          err.code === err.PERMISSION_DENIED
            ? 'Permissão de localização negada.'
            : 'Não foi possível obter a localização.',
        );
        setGpsLoading(false);
      },
      { timeout: 10000, maximumAge: 60000 },
    );
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative" ref={suggestionsRef}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <i
              className="fas fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              aria-hidden="true"
              style={{ fontSize: '0.8rem' }}
            />
            {searchLoading && (
              <i
                className="fas fa-circle-notch fa-spin absolute right-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none"
                aria-hidden="true"
                style={{ fontSize: '0.75rem' }}
              />
            )}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Pesquisar destino..."
              aria-label="Pesquisar destino no mapa"
              aria-autocomplete="list"
              aria-expanded={showSuggestions}
              className="w-full rounded-lg border border-border bg-background text-foreground pl-9 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button
            onClick={handleUseGps}
            disabled={gpsLoading}
            aria-label="Usar localização atual"
            title="Usar localização atual"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            style={{ fontSize: '0.8rem' }}
          >
            {gpsLoading
              ? <i className="fas fa-circle-notch fa-spin" aria-hidden="true" />
              : <i className="fas fa-location-crosshairs" aria-hidden="true" />}
            <span className="hidden sm:inline">Localização atual</span>
          </button>
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <ul
            role="listbox"
            aria-label="Sugestões de destino"
            className="absolute z-[1000] left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden"
          >
            {suggestions.map((s, i) => (
              <li key={i} role="option" aria-selected={false}>
                <button
                  onClick={() => handleSuggestionSelect(s)}
                  className="w-full text-left px-4 py-2.5 hover:bg-primary/5 hover:text-primary transition-colors flex items-start gap-2"
                  style={{ fontSize: '0.82rem' }}
                >
                  <i className="fas fa-location-dot text-primary mt-0.5 shrink-0" aria-hidden="true" style={{ fontSize: '0.75rem' }} />
                  <span className="line-clamp-2 text-foreground">{s.display_name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {gpsError && (
        <p className="text-error flex items-center gap-1.5" style={{ fontSize: '0.75rem' }}>
          <i className="fas fa-triangle-exclamation" aria-hidden="true" />
          {gpsError}
        </p>
      )}

      <div className="relative rounded-xl overflow-hidden border border-border/60" style={{ height }}>
        <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
        {!value && (
          <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none">
            <div className="bg-card/90 backdrop-blur-sm border border-border rounded-xl px-4 py-2 flex items-center gap-2 shadow-lg">
              <i className="fas fa-hand-pointer text-primary" aria-hidden="true" style={{ fontSize: '0.85rem' }} />
              <span className="text-foreground font-medium" style={{ fontSize: '0.8rem' }}>
                Clique no mapa ou pesquise para escolher o destino
              </span>
            </div>
          </div>
        )}
        {value && (
          <div className="absolute bottom-3 left-3 right-3 pointer-events-none">
            <div className="bg-card/90 backdrop-blur-sm border border-border rounded-xl px-3 py-2 flex items-start gap-2 shadow-lg">
              <i className="fas fa-location-dot text-primary mt-0.5 shrink-0" aria-hidden="true" style={{ fontSize: '0.75rem' }} />
              <span className="text-foreground line-clamp-1" style={{ fontSize: '0.75rem' }}>{value.label}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
