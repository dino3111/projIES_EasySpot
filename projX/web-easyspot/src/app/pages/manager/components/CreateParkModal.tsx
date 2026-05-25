import { useState, useEffect, useRef } from 'react';
import {
  fetchTechnicians,
  createPark,
  configureParkLayout,
  type TechnicianSummary,
  type ParkLayoutSpotPayload,
  type ParkLayoutEvChargerPayload,
  type ParkLayoutAccessiblePayload,
} from '../../../services/managerApi';

interface Props {
  readonly onClose: () => void;
  readonly onCreated: () => void;
}

type FloorConfig = {
  id: string;
  label: string;
  rows: string;
  cols: string;
  standardSpots: string;
  evSpots: string;
  accessibleSpots: string;
  reservedSpots: string;
};

const DEFAULT_FLOOR: FloorConfig = {
  id: 'P0',
  label: 'Piso 0',
  rows: '5',
  cols: '8',
  standardSpots: '30',
  evSpots: '4',
  accessibleSpots: '4',
  reservedSpots: '2',
};

export function CreateParkModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [openingHours, setOpeningHours] = useState('');
  const [totalSpaces, setTotalSpaces] = useState('');
  const [amenitiesInput, setAmenitiesInput] = useState('');

  const [floors, setFloors] = useState<FloorConfig[]>([{ ...DEFAULT_FLOOR }]);
  const [chargerType, setChargerType] = useState('Type 2');
  const [chargerSpeed, setChargerSpeed] = useState('Rápida (22kW)');
  const [chargerPrice, setChargerPrice] = useState('0.30');

  const [technicians, setTechnicians] = useState<TechnicianSummary[]>([]);
  const [techSearch, setTechSearch] = useState('');
  const [selectedTech, setSelectedTech] = useState<TechnicianSummary | null>(null);
  const [showTechDropdown, setShowTechDropdown] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTechnicians().then(setTechnicians).catch(() => setTechnicians([]));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowTechDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredTechs = technicians.filter(
    (t) =>
      t.name.toLowerCase().includes(techSearch.toLowerCase()) ||
      t.email.toLowerCase().includes(techSearch.toLowerCase()),
  );

  const handleSelectTech = (tech: TechnicianSummary) => {
    setSelectedTech(tech);
    setTechSearch(tech.name);
    setShowTechDropdown(false);
  };

  const handleClearTech = () => {
    setSelectedTech(null);
    setTechSearch('');
  };

  const addFloor = () => {
    const nextIndex = floors.length;
    setFloors((prev) => [
      ...prev,
      {
        ...DEFAULT_FLOOR,
        id: `P${nextIndex}`,
        label: `Piso ${nextIndex}`,
      },
    ]);
  };

  const updateFloor = (idx: number, patch: Partial<FloorConfig>) => {
    setFloors((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  };

  const removeFloor = (idx: number) => {
    setFloors((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  };

  const parsePositiveInt = (value: string, fallback = 0) => {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };

  const parseNonNegativeInt = (value: string, fallback = 0) => {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };

  const generateLayout = () => {
    const spots: ParkLayoutSpotPayload[] = [];
    const evChargers: ParkLayoutEvChargerPayload[] = [];
    const accessibleSpots: ParkLayoutAccessiblePayload[] = [];

    for (const floor of floors) {
      const floorId = floor.id.trim() || 'P0';
      const rows = parsePositiveInt(floor.rows, 1);
      const cols = parsePositiveInt(floor.cols, 1);
      const capacity = rows * cols;

      const standard = parseNonNegativeInt(floor.standardSpots);
      const ev = parseNonNegativeInt(floor.evSpots);
      const accessible = parseNonNegativeInt(floor.accessibleSpots);
      const reserved = parseNonNegativeInt(floor.reservedSpots);
      const requested = standard + ev + accessible + reserved;

      if (requested > capacity) {
        throw new Error(`No ${floor.label}, os lugares (${requested}) excedem a capacidade do mapa (${capacity}).`);
      }

      const sequence: Array<{ zone: 'STANDARD' | 'EV' | 'ACCESSIBLE' | 'RESERVED'; count: number; prefix: string }> = [
        { zone: 'EV', count: ev, prefix: 'EV' },
        { zone: 'ACCESSIBLE', count: accessible, prefix: 'AC' },
        { zone: 'RESERVED', count: reserved, prefix: 'R' },
        { zone: 'STANDARD', count: standard, prefix: 'S' },
      ];

      let index = 0;
      const pricePerKwh = Number.parseFloat(chargerPrice);
      for (const bucket of sequence) {
        for (let i = 0; i < bucket.count; i++) {
          const row = Math.floor(index / cols) + 1;
          const col = (index % cols) + 1;
          const spotNumber = `${floorId}:${bucket.prefix}${String(i + 1).padStart(2, '0')}`;
          spots.push({ spotNumber, zone: bucket.zone, row, col });

          if (bucket.zone === 'EV') {
            evChargers.push({
              type: chargerType,
              speed: chargerSpeed,
              pricePerKwh: Number.isFinite(pricePerKwh) ? pricePerKwh : 0,
              available: true,
            });
          }

          if (bucket.zone === 'ACCESSIBLE') {
            accessibleSpots.push({
              location: `${floor.label} - ${spotNumber}`,
              available: true,
              distanceToEntranceMeters: 10,
              baySize: '3.5m x 5.0m',
              monitored: false,
              hasRampSpace: true,
              sensorStatus: 'online',
              ledStatus: 'green',
            });
          }

          index += 1;
        }
      }
    }

    return { spots, evChargers, accessibleSpots };
  };

  const handleSave = async () => {
    setError(null);
    if (!name || !city || !district || !address || !latitude || !longitude) {
      setError('Preenche os dados base do parque (nome, cidade, distrito, morada e coordenadas são obrigatórios).');
      return;
    }

    setSaving(true);
    try {
      const { spots, evChargers, accessibleSpots } = generateLayout();
      const computedSpaces = spots.length;
      const fallbackSpaces = parsePositiveInt(totalSpaces, 1);
      const finalSpaces = computedSpaces > 0 ? computedSpaces : fallbackSpaces;

      const created = await createPark({
        name,
        city,
        district,
        address,
        latitude: Number.parseFloat(latitude),
        longitude: Number.parseFloat(longitude),
        openingHours,
        totalSpaces: finalSpaces,
        technicianId: selectedTech?.id ?? null,
      });

      const amenities = amenitiesInput
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);

      await configureParkLayout(created.id, {
        amenities,
        spots,
        evChargers,
        accessibleSpots,
      });

      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar parque com layout completo. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Criar novo parque"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-foreground" style={{ fontSize: '1.05rem', fontWeight: 800 }}>
              Novo Parque - Fluxo Completo
            </h2>
            <p className="text-muted-foreground" style={{ fontSize: '0.78rem' }}>
              Dados base + mapa com pisos/lugares + EV/acessível
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground disabled:opacity-50"
            aria-label="Fechar"
          >
            <i className="fas fa-xmark" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <div className="space-y-3">
            <h3 className="text-foreground" style={{ fontSize: '0.86rem', fontWeight: 800 }}>1) Dados do Parque</h3>
            <FieldRow id="park-name" label="Nome *" icon="fa-parking">
              <input id="park-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Parque Central" className="w-full bg-transparent text-foreground outline-none" style={{ fontSize: '0.875rem' }} />
            </FieldRow>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow id="park-city" label="Cidade *" icon="fa-city">
                <input id="park-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Aveiro" className="w-full bg-transparent text-foreground outline-none" style={{ fontSize: '0.875rem' }} />
              </FieldRow>
              <FieldRow id="park-district" label="Distrito *" icon="fa-map">
                <input id="park-district" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Aveiro" className="w-full bg-transparent text-foreground outline-none" style={{ fontSize: '0.875rem' }} />
              </FieldRow>
            </div>
            <FieldRow id="park-spaces" label="Lugares (fallback)" icon="fa-car">
              <input id="park-spaces" type="number" min="1" value={totalSpaces} onChange={(e) => setTotalSpaces(e.target.value)} placeholder="200" className="w-full bg-transparent text-foreground outline-none" style={{ fontSize: '0.875rem' }} />
            </FieldRow>
            <FieldRow id="park-address" label="Morada *" icon="fa-location-dot">
              <input id="park-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua de Aveiro, 1" className="w-full bg-transparent text-foreground outline-none" style={{ fontSize: '0.875rem' }} />
            </FieldRow>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow id="park-lat" label="Latitude *" icon="fa-globe">
                <input id="park-lat" type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="40.6405" className="w-full bg-transparent text-foreground outline-none" style={{ fontSize: '0.875rem' }} />
              </FieldRow>
              <FieldRow id="park-lng" label="Longitude *" icon="fa-globe">
                <input id="park-lng" type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="-8.6537" className="w-full bg-transparent text-foreground outline-none" style={{ fontSize: '0.875rem' }} />
              </FieldRow>
            </div>
            <FieldRow id="park-hours" label="Horário" icon="fa-clock">
              <input id="park-hours" value={openingHours} onChange={(e) => setOpeningHours(e.target.value)} placeholder="08:00-22:00 ou 24h" className="w-full bg-transparent text-foreground outline-none" style={{ fontSize: '0.875rem' }} />
            </FieldRow>
            <FieldRow id="park-amenities" label="Amenities (vírgula)" icon="fa-list-check">
              <input id="park-amenities" value={amenitiesInput} onChange={(e) => setAmenitiesInput(e.target.value)} placeholder="wc,coberto,segurança" className="w-full bg-transparent text-foreground outline-none" style={{ fontSize: '0.875rem' }} />
            </FieldRow>

            <div>
              <label className="block text-foreground mb-1.5" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                <i className="fas fa-user-gear text-primary mr-1.5" aria-hidden="true" />
                Técnico Responsável
              </label>
              <div className="relative" ref={dropdownRef}>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-muted/30 focus-within:border-primary transition-colors">
                  <i className="fas fa-magnifying-glass text-muted-foreground flex-shrink-0" style={{ fontSize: '0.8rem' }} aria-hidden="true" />
                  <input
                    value={techSearch}
                    onChange={(e) => {
                      setTechSearch(e.target.value);
                      setSelectedTech(null);
                      setShowTechDropdown(true);
                    }}
                    onFocus={() => setShowTechDropdown(true)}
                    placeholder="Pesquisar técnico..."
                    className="flex-1 bg-transparent text-foreground outline-none"
                    style={{ fontSize: '0.875rem' }}
                    autoComplete="off"
                  />
                  {selectedTech && (
                    <button type="button" onClick={handleClearTech} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Limpar técnico selecionado">
                      <i className="fas fa-xmark" style={{ fontSize: '0.8rem' }} aria-hidden="true" />
                    </button>
                  )}
                </div>

                {showTechDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                    {filteredTechs.length === 0 ? (
                      <div className="px-3 py-3 text-muted-foreground text-center" style={{ fontSize: '0.8rem' }}>
                        Nenhum técnico encontrado
                      </div>
                    ) : (
                      filteredTechs.map((tech) => (
                        <button key={tech.id} type="button" onClick={() => handleSelectTech(tech)} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted transition-colors text-left">
                          <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                            <i className="fas fa-user text-primary" style={{ fontSize: '0.7rem' }} aria-hidden="true" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-foreground truncate" style={{ fontSize: '0.82rem', fontWeight: 600 }}>{tech.name}</p>
                            <p className="text-muted-foreground truncate" style={{ fontSize: '0.72rem' }}>{tech.email}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-foreground" style={{ fontSize: '0.86rem', fontWeight: 800 }}>2) Layout do Mapa</h3>
              <button type="button" onClick={addFloor} className="px-2.5 py-1 rounded-lg border border-border text-foreground hover:bg-muted" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                <i className="fas fa-plus mr-1" />Adicionar Piso
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <FieldRow id="charger-type" label="Tipo EV" icon="fa-plug-circle-bolt">
                <input id="charger-type" value={chargerType} onChange={(e) => setChargerType(e.target.value)} className="w-full bg-transparent text-foreground outline-none" style={{ fontSize: '0.82rem' }} />
              </FieldRow>
              <FieldRow id="charger-speed" label="Velocidade EV" icon="fa-gauge-high">
                <input id="charger-speed" value={chargerSpeed} onChange={(e) => setChargerSpeed(e.target.value)} className="w-full bg-transparent text-foreground outline-none" style={{ fontSize: '0.82rem' }} />
              </FieldRow>
              <FieldRow id="charger-price" label="€/kWh" icon="fa-euro-sign">
                <input id="charger-price" type="number" step="0.01" min="0" value={chargerPrice} onChange={(e) => setChargerPrice(e.target.value)} className="w-full bg-transparent text-foreground outline-none" style={{ fontSize: '0.82rem' }} />
              </FieldRow>
            </div>

            <div className="space-y-2">
              {floors.map((floor, idx) => (
                <div key={`${floor.id}-${idx}`} className="rounded-xl border border-border p-3 bg-muted/20">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-foreground" style={{ fontSize: '0.8rem', fontWeight: 700 }}>{floor.label}</p>
                    <button type="button" onClick={() => removeFloor(idx)} className="text-muted-foreground hover:text-destructive" disabled={floors.length <= 1}>
                      <i className="fas fa-trash" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <MiniInput label="ID Piso" value={floor.id} onChange={(v) => updateFloor(idx, { id: v })} />
                    <MiniInput label="Nome" value={floor.label} onChange={(v) => updateFloor(idx, { label: v })} />
                    <MiniInput label="Linhas" type="number" value={floor.rows} onChange={(v) => updateFloor(idx, { rows: v })} />
                    <MiniInput label="Colunas" type="number" value={floor.cols} onChange={(v) => updateFloor(idx, { cols: v })} />
                    <MiniInput label="Standard" type="number" value={floor.standardSpots} onChange={(v) => updateFloor(idx, { standardSpots: v })} />
                    <MiniInput label="EV" type="number" value={floor.evSpots} onChange={(v) => updateFloor(idx, { evSpots: v })} />
                    <MiniInput label="Acessíveis" type="number" value={floor.accessibleSpots} onChange={(v) => updateFloor(idx, { accessibleSpots: v })} />
                    <MiniInput label="Reservados" type="number" value={floor.reservedSpots} onChange={(v) => updateFloor(idx, { reservedSpots: v })} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-xl bg-destructive/10 text-destructive flex items-center gap-2" style={{ fontSize: '0.8rem' }}>
            <i className="fas fa-triangle-exclamation" aria-hidden="true" />
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl border border-border bg-muted/40 text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
            style={{ fontSize: '0.85rem', fontWeight: 600 }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ fontSize: '0.85rem', fontWeight: 700 }}
          >
            {saving ? <i className="fas fa-circle-notch fa-spin" aria-hidden="true" /> : <i className="fas fa-map" aria-hidden="true" />}
            Criar Parque Completo
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldRow({
  id,
  label,
  icon,
  children,
}: {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-foreground mb-1.5" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
        <i className={`fas ${icon} text-primary mr-1.5`} aria-hidden="true" />
        {label}
      </label>
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-muted/30 focus-within:border-primary transition-colors">
        {children}
      </div>
    </div>
  );
}

function MiniInput({
  label,
  value,
  onChange,
  type = 'text',
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly type?: string;
}) {
  return (
    <label className="text-muted-foreground" style={{ fontSize: '0.72rem' }}>
      <span className="block mb-1">{label}</span>
      <input
        type={type}
        min={type === 'number' ? '0' : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-card border border-border rounded-lg px-2 py-1.5 text-foreground"
        style={{ fontSize: '0.78rem' }}
      />
    </label>
  );
}
