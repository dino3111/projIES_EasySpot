import { useState, useEffect, useRef } from 'react';

export interface Coords {
  lat: number;
  lng: number;
}

interface NominatimResult {
  lat: string;
  lon: string;
}

async function geocodeCity(city: string, signal: AbortSignal): Promise<Coords | null> {
  const params = new URLSearchParams({ q: city, format: 'json', limit: '1', countrycodes: 'pt' });
  const resp = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { 'Accept-Language': 'pt', 'User-Agent': 'EasySpot/1.0' },
    signal,
  });
  if (!resp.ok) return null;
  const results: NominatimResult[] = await resp.json();
  if (!results.length) return null;
  return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
}

interface UseGeocodingResult {
  coords: Coords | null;
  loading: boolean;
  error: boolean;
}

export function useGeocoding(city: string | null, debounceMs = 500): UseGeocodingResult {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!city) {
      setCoords(null);
      setLoading(false);
      setError(false);
      return;
    }

    const timeout = setTimeout(async () => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setLoading(true);
      setError(false);

      try {
        const result = await geocodeCity(city, abortRef.current.signal);
        if (result) {
          setCoords(result);
          setError(false);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => {
      clearTimeout(timeout);
      abortRef.current?.abort();
    };
  }, [city, debounceMs]);

  return { coords, loading, error };
}
