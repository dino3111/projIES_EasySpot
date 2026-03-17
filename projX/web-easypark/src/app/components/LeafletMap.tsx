import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import type { ParkingLot } from '../data/parkingData';

// Importar Leaflet e CSS
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Corrigir ícones padrão do Leaflet com Vite
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/* ── Criar ícones SVG personalizados ─────────────────────────────────── */
function createParkingIcon(color: string, isSelected: boolean) {
  const size = isSelected ? 44 : 36;
  const pulse = isSelected
    ? `<circle cx="22" cy="22" r="20" fill="${color}" opacity="0.25">
         <animate attributeName="r" from="20" to="28" dur="1.2s" repeatCount="indefinite"/>
         <animate attributeName="opacity" from="0.25" to="0" dur="1.2s" repeatCount="indefinite"/>
       </circle>`
    : '';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 44 44">
      ${pulse}
      <circle cx="22" cy="22" r="${isSelected ? 18 : 15}" fill="${color}" stroke="white" stroke-width="3" filter="url(#shadow)"/>
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.35)"/>
        </filter>
      </defs>
      <text x="22" y="27" text-anchor="middle" font-size="14" font-weight="800" fill="white" font-family="Arial, sans-serif">P</text>
    </svg>`;

  return L.divIcon({
    html: svg,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
    className: 'leaflet-parking-icon',
  });
}

function getPinColor(lot: ParkingLot): string {
  const pct = lot.availableSpots / lot.totalSpots;
  if (lot.availableSpots === 0) return '#ef4444'; // cheio → vermelho
  if (pct < 0.2) return '#f59e0b'; // quase cheio → amarelo
  return '#22c55e'; // disponível → verde
}

/* ── Tipos ────────────────────────────────────────────────────────────── */
interface LeafletMapProps {
  readonly lots: ParkingLot[];
  readonly selectedId?: string | null;
  readonly onSelect?: (id: string) => void;
  /** Modo single: exibe apenas 1 parque, centrado, sem interação */
  readonly singleLot?: ParkingLot;
  readonly height?: string;
  readonly className?: string;
}

/* ── Componente principal ─────────────────────────────────────────────── */
export function LeafletMap({
  lots,
  selectedId,
  onSelect,
  singleLot,
  height = '100%',
  className = '',
}: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Guardar o último selectedId que causou um flyTo, para evitar re-animações desnecessárias
  const lastFlyToIdRef = useRef<string | null>(null);

  // Tile URLs – CartoDB Voyager (light) e Dark Matter (dark)
  const tileLight =
    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  const tileDark =
    'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  const tileUrl = isDark ? tileDark : tileLight;
  const attribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

  /* ─── Inicializar mapa ─────────────────────────────────────────── */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: !singleLot,
      dragging: !singleLot || window.outerWidth > 640,
      doubleClickZoom: !singleLot,
      // Desativar animações de zoom que causam tremor
      zoomSnap: 0.5,
      wheelPxPerZoomLevel: 120,
      zoomAnimation: false,
    });

    if (singleLot) {
      map.setView([singleLot.latitude, singleLot.longitude], 16);
    } else if (lots && lots.length > 0) {
      const bounds = L.latLngBounds(lots.map(lot => [lot.latitude, lot.longitude]));
      map.fitBounds(bounds, { padding: [20, 20], animate: false });
    } else {
      map.setView([38.7223, -9.1393], 14);
    }

    // Controlo de zoom no canto inferior direito
    if (!singleLot) {
      L.control.zoom({ position: 'bottomright' }).addTo(map);
    }

    // Camada de tiles inicial
    L.tileLayer(tileUrl, { attribution, maxZoom: 20 }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasFitBounds = useRef(false);

  /* ─── Atualizar tiles quando muda o tema ──────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) map.removeLayer(layer);
    });
    L.tileLayer(tileUrl, { attribution, maxZoom: 20 }).addTo(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark]);

  /* ─── Atualizar markers ───────────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const activeLots = singleLot ? [singleLot] : lots;

    // Remover markers antigos que já não existem
    markersRef.current.forEach((marker, id) => {
      if (!activeLots.some((l) => l.id === id)) {
        map.removeLayer(marker);
        markersRef.current.delete(id);
      }
    });

    activeLots.forEach((lot) => {
      const isSelected = lot.id === selectedId;
      const icon = createParkingIcon(getPinColor(lot), isSelected);

      if (markersRef.current.has(lot.id)) {
        const existing = markersRef.current.get(lot.id)!;
        existing.setIcon(icon);
      } else {
        const marker = L.marker([lot.latitude, lot.longitude], { icon });

        if (!singleLot && onSelect) {
          marker.on('click', () => onSelect(lot.id));
        }

        marker.addTo(map);
        markersRef.current.set(lot.id, marker);
      }
    });

    // Ajustar bounds na primeira vez que os lots são carregados
    if (activeLots.length > 0 && !singleLot && !hasFitBounds.current) {
      const bounds = L.latLngBounds(activeLots.map(lot => [lot.latitude, lot.longitude]));
      map.fitBounds(bounds, { padding: [20, 20], animate: false });
      hasFitBounds.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lots, selectedId, singleLot]);

  /* ─── Voar para parque selecionado (apenas quando o ID muda, não em updates de dados) */
  useEffect(() => {
    if (!selectedId || !mapRef.current) return;
    // Só anima se o ID selecionado for diferente do último flyTo (evita tremor em updates de tempo real)
    if (lastFlyToIdRef.current === selectedId) return;
    lastFlyToIdRef.current = selectedId;

    const lot = lots.find((l) => l.id === selectedId);
    if (lot) {
      mapRef.current.setView([lot.latitude, lot.longitude], 15, { animate: true, duration: 0.6 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return (
    <div ref={containerRef} style={{ height, width: '100%' }} className={className} />
  );
}
