import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function createParkingStyleIcon() {
  const size = 36;
  const color = '#0ea5e9';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="15" fill="${color}" stroke="white" stroke-width="3" filter="url(#shadow)"/>
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.35)"/>
        </filter>
      </defs>
      <circle cx="22" cy="22" r="4.5" fill="white"/>
    </svg>`;

  return L.divIcon({
    html: svg,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
    className: 'leaflet-parking-icon',
  });
}

interface LocationPreviewMapProps {
  readonly lat: number;
  readonly lng: number;
  readonly height?: string;
}

export function LocationPreviewMap({ lat, lng, height = '190px' }: LocationPreviewMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const tileLight = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  const tileDark  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  const tileUrl   = isDark ? tileDark : tileLight;
  const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: false,
      dragging: true,
      doubleClickZoom: false,
      zoomSnap: 0.5,
      wheelPxPerZoomLevel: 120,
      zoomAnimation: false,
    });

    map.setView([lat, lng], 16);
    L.tileLayer(tileUrl, { attribution, maxZoom: 20 }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    markerRef.current = L.marker([lat, lng], { icon: createParkingStyleIcon() }).addTo(map);
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
    map.setView([lat, lng], 16, { animate: true, duration: 0.4 });
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]).setIcon(createParkingStyleIcon());
    }
  }, [lat, lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) map.removeLayer(layer);
    });
    L.tileLayer(tileUrl, { attribution, maxZoom: 20 }).addTo(map);
  }, [attribution, tileUrl]);

  return <div ref={containerRef} style={{ height, width: '100%' }} />;
}
