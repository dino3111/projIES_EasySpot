import { useState, useEffect, useRef } from 'react';
import {
  fetchTechnicians,
  createPark,
  type TechnicianSummary,
} from '../../../services/managerApi';

interface Props {
  readonly onClose: () => void;
  readonly onCreated: () => void;
}

export function CreateParkModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [openingHours, setOpeningHours] = useState('');
  const [totalSpaces, setTotalSpaces] = useState('');

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

  const handleSave = async () => {
    setError(null);
    if (!name || !city || !address || !latitude || !longitude || !totalSpaces) {
      setError('Preenche todos os campos obrigatórios.');
      return;
    }
    setSaving(true);
    try {
      await createPark({
        name,
        city,
        address,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        openingHours,
        totalSpaces: parseInt(totalSpaces, 10),
        technicianId: selectedTech?.id ?? null,
      });
      onCreated();
      onClose();
    } catch {
      setError('Erro ao criar parque. Tente novamente.');
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
      <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-foreground" style={{ fontSize: '1.05rem', fontWeight: 800 }}>
              Novo Parque
            </h2>
            <p className="text-muted-foreground" style={{ fontSize: '0.78rem' }}>
              Preenche os dados do novo parque de estacionamento
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

        <div className="space-y-3 mb-5">
          <FieldRow id="park-name" label="Nome *" icon="fa-parking">
            <input
              id="park-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Parque Central"
              className="w-full bg-transparent text-foreground outline-none"
              style={{ fontSize: '0.875rem' }}
            />
          </FieldRow>

          <div className="grid grid-cols-2 gap-3">
            <FieldRow id="park-city" label="Cidade *" icon="fa-city">
              <input
                id="park-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="ex: Aveiro"
                className="w-full bg-transparent text-foreground outline-none"
                style={{ fontSize: '0.875rem' }}
              />
            </FieldRow>
            <FieldRow id="park-spaces" label="Lugares *" icon="fa-car">
              <input
                id="park-spaces"
                type="number"
                min="1"
                value={totalSpaces}
                onChange={(e) => setTotalSpaces(e.target.value)}
                placeholder="ex: 200"
                className="w-full bg-transparent text-foreground outline-none"
                style={{ fontSize: '0.875rem' }}
              />
            </FieldRow>
          </div>

          <FieldRow id="park-address" label="Morada *" icon="fa-location-dot">
            <input
              id="park-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="ex: Rua de Aveiro, 1, Aveiro"
              className="w-full bg-transparent text-foreground outline-none"
              style={{ fontSize: '0.875rem' }}
            />
          </FieldRow>

          <div className="grid grid-cols-2 gap-3">
            <FieldRow id="park-lat" label="Latitude *" icon="fa-globe">
              <input
                id="park-lat"
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="ex: 40.6405"
                className="w-full bg-transparent text-foreground outline-none"
                style={{ fontSize: '0.875rem' }}
              />
            </FieldRow>
            <FieldRow id="park-lng" label="Longitude *" icon="fa-globe">
              <input
                id="park-lng"
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="ex: -8.6537"
                className="w-full bg-transparent text-foreground outline-none"
                style={{ fontSize: '0.875rem' }}
              />
            </FieldRow>
          </div>

          <FieldRow id="park-hours" label="Horário" icon="fa-clock">
            <input
              id="park-hours"
              value={openingHours}
              onChange={(e) => setOpeningHours(e.target.value)}
              placeholder="ex: 08:00–22:00 ou 24h"
              className="w-full bg-transparent text-foreground outline-none"
              style={{ fontSize: '0.875rem' }}
            />
          </FieldRow>

          {/* Técnico responsável — combobox pesquisável */}
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
                  placeholder="Pesquisar técnico por nome ou email..."
                  className="flex-1 bg-transparent text-foreground outline-none"
                  style={{ fontSize: '0.875rem' }}
                  autoComplete="off"
                />
                {selectedTech && (
                  <button
                    type="button"
                    onClick={handleClearTech}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Limpar técnico selecionado"
                  >
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
                      <button
                        key={tech.id}
                        type="button"
                        onClick={() => handleSelectTech(tech)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                          <i className="fas fa-user text-primary" style={{ fontSize: '0.7rem' }} aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-foreground truncate" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                            {tech.name}
                          </p>
                          <p className="text-muted-foreground truncate" style={{ fontSize: '0.72rem' }}>
                            {tech.email}
                          </p>
                        </div>
                        {selectedTech?.id === tech.id && (
                          <i className="fas fa-check text-primary ml-auto flex-shrink-0" style={{ fontSize: '0.8rem' }} aria-hidden="true" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {selectedTech && (
              <p className="text-primary mt-1.5 flex items-center gap-1" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                <i className="fas fa-circle-check" aria-hidden="true" />
                {selectedTech.name} selecionado
              </p>
            )}
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
            {saving ? (
              <i className="fas fa-circle-notch fa-spin" aria-hidden="true" />
            ) : (
              <i className="fas fa-plus" aria-hidden="true" />
            )}
            Criar Parque
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
