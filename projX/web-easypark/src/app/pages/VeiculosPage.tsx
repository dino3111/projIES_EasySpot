import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { useProfile, type Vehicle } from '../context/ProfileContext';
import { lookupVehicleData, lookupInsuranceData, type VehicleData, type InsuranceData } from '../../services/vehicleLookup';
import { getBrandLogoUrl, detectChargerTypes, isEVFuelType } from '../utils/brandLogo';

const PT_PLATE_REGEX = /^[A-Z0-9]{2}-[A-Z0-9]{2}-[A-Z0-9]{2}$/;

const CHARGER_ICONS: Record<string, string> = {
  'Type 2': 'fa-plug',
  'CCS': 'fa-bolt',
  'CHAdeMO': 'fa-charging-station',
  'Tesla Supercharger': 'fa-bolt-lightning',
};

export function VeiculosPage() {
  const { vehicles, addVehicle, updateVehicle, removeVehicle, setPrimaryVehicle } = useProfile();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const openEditModal = (vehicle: Vehicle) => { setSelectedVehicle(vehicle); setShowEditModal(true); };
  const closeEditModal = () => { setSelectedVehicle(null); setShowEditModal(false); };
  const openDeleteDialog = (vehicle: Vehicle) => { setSelectedVehicle(vehicle); setShowDeleteDialog(true); };
  const closeDeleteDialog = () => { setSelectedVehicle(null); setShowDeleteDialog(false); };

  const handleDelete = () => {
    if (!selectedVehicle) return;
    removeVehicle(selectedVehicle.id);
    toast.success('Veículo removido com sucesso');
    closeDeleteDialog();
  };

  const handleSetPrimary = (id: string) => {
    setPrimaryVehicle(id);
    toast.success('Veículo principal alterado');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 pb-24">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/perfil" className="w-8 h-8 rounded-xl bg-muted hover:bg-muted/80 transition-colors flex items-center justify-center">
              <i className="fas fa-arrow-left text-foreground" style={{ fontSize: '0.85rem' }} />
            </Link>
            <h1 className="text-foreground" style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.2 }}>Os Meus Veículos</h1>
          </div>
          <p className="text-muted-foreground ml-10" style={{ fontSize: '0.875rem' }}>
            Gere os teus veículos e define o principal
          </p>
        </div>
      </div>

      {vehicles.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-20 h-20 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
            <i className="fas fa-car text-muted-foreground" style={{ fontSize: '2rem' }} />
          </div>
          <p className="text-foreground font-bold mb-1" style={{ fontSize: '1rem' }}>Nenhum veículo registado</p>
          <p className="text-muted-foreground mb-5" style={{ fontSize: '0.85rem' }}>
            Adiciona o teu primeiro veículo para começar
          </p>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary rounded-full px-6" style={{ fontSize: '0.875rem' }}>
            <i className="fas fa-plus mr-2" style={{ fontSize: '0.85rem' }} />
            Adicionar Veículo
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-5">
            {vehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                onEdit={() => openEditModal(vehicle)}
                onDelete={() => openDeleteDialog(vehicle)}
                onSetPrimary={() => handleSetPrimary(vehicle.id)}
              />
            ))}
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full rounded-2xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all py-4 bg-transparent cursor-pointer"
          >
            <i className="fas fa-plus text-primary" style={{ fontSize: '1.1rem' }} />
            <p className="text-primary font-bold mt-2" style={{ fontSize: '0.875rem' }}>Adicionar Novo Veículo</p>
          </button>
        </>
      )}

      {showAddModal && <AddVehicleModal onClose={() => setShowAddModal(false)} onAdd={addVehicle} />}
      {showEditModal && selectedVehicle && (
        <EditVehicleModal
          vehicle={selectedVehicle}
          onClose={closeEditModal}
          onUpdate={(updates) => { updateVehicle(selectedVehicle.id, updates); closeEditModal(); toast.success('Veículo atualizado com sucesso'); }}
        />
      )}
      {showDeleteDialog && selectedVehicle && (
        <DeleteVehicleDialog vehicle={selectedVehicle} onClose={closeDeleteDialog} onConfirm={handleDelete} />
      )}
    </div>
  );
}

/* ── BrandLogo ──────────────────────────────────────────────────────────────── */

function BrandLogo({ make }: { make?: string }) {
  const url = getBrandLogoUrl(make);
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return <i className="fas fa-car text-muted-foreground" style={{ fontSize: '1.4rem' }} />;
  }

  return (
    <img
      src={url}
      alt={make}
      className="w-10 h-10 object-contain"
      onError={() => setFailed(true)}
    />
  );
}

/* ── VehicleCard ────────────────────────────────────────────────────────────── */

function VehicleCard({
  vehicle, onEdit, onDelete, onSetPrimary,
}: Readonly<{ vehicle: Vehicle; onEdit: () => void; onDelete: () => void; onSetPrimary: () => void }>) {
  return (
    <div className={`rounded-2xl p-4 bg-card border transition-all ${vehicle.isPrimary ? 'border-primary shadow-md shadow-primary/10' : 'border-border'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
            <BrandLogo make={vehicle.make} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <h3 className="text-foreground font-extrabold" style={{ fontSize: '1.1rem' }}>{vehicle.plate}</h3>
              {vehicle.isPrimary && (
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold" style={{ fontSize: '0.65rem' }}>PRINCIPAL</span>
              )}
            </div>
            {vehicle.nickname && <p className="text-muted-foreground" style={{ fontSize: '0.8rem' }}>{vehicle.nickname}</p>}
            {vehicle.make && vehicle.model && (
              <p className="text-foreground font-semibold" style={{ fontSize: '0.82rem' }}>{vehicle.make} {vehicle.model}{vehicle.year ? ` (${vehicle.year.slice(0, 4)})` : ''}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          {vehicle.isEV && (
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center" title="Veículo Elétrico">
              <i className="fas fa-bolt text-green-500" style={{ fontSize: '0.75rem' }} />
            </div>
          )}
          {vehicle.isAccessible && (
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center" title="Mobilidade Reduzida">
              <i className="fas fa-wheelchair text-blue-500" style={{ fontSize: '0.75rem' }} />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3 text-muted-foreground" style={{ fontSize: '0.78rem' }}>
        {vehicle.fuelType && (
          <div className="flex items-center gap-1.5">
            <i className={`fas ${vehicle.isEV ? 'fa-charging-station' : 'fa-gas-pump'}`} style={{ fontSize: '0.72rem', color: vehicle.isEV ? '#22c55e' : undefined }} />
            <span>{vehicle.fuelType}</span>
          </div>
        )}
        {vehicle.color && (
          <div className="flex items-center gap-1.5">
            <i className="fas fa-palette" style={{ fontSize: '0.72rem' }} />
            <span>{vehicle.color}</span>
          </div>
        )}
        {vehicle.rfid && (
          <div className="flex items-center gap-1.5">
            <i className="fas fa-id-card" style={{ fontSize: '0.72rem', color: '#7357ec' }} />
            <span className="font-mono" style={{ fontSize: '0.72rem' }}>{vehicle.rfid}</span>
          </div>
        )}
      </div>

      {vehicle.isEV && vehicle.chargerTypes && vehicle.chargerTypes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {vehicle.chargerTypes.map((type) => (
            <span
              key={type}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 font-semibold"
              style={{ fontSize: '0.7rem' }}
            >
              <i className={`fas ${CHARGER_ICONS[type] ?? 'fa-plug'}`} style={{ fontSize: '0.65rem' }} />
              {type}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 pt-3 border-t border-border">
        {!vehicle.isPrimary && (
          <button onClick={onSetPrimary} className="flex-1 btn btn-sm btn-outline rounded-full" style={{ fontSize: '0.75rem' }}>
            <i className="fas fa-star mr-1.5" style={{ fontSize: '0.7rem' }} />
            Definir como Principal
          </button>
        )}
        <button type="button" aria-label="Editar veículo" onClick={onEdit} className="btn btn-sm btn-ghost rounded-full" style={{ fontSize: '0.75rem' }}>
          <i className="fas fa-pen" style={{ fontSize: '0.7rem' }} />
        </button>
        <button type="button" aria-label="Remover veículo" onClick={onDelete} className="btn btn-sm btn-ghost text-error rounded-full" style={{ fontSize: '0.75rem' }}>
          <i className="fas fa-trash" style={{ fontSize: '0.7rem' }} />
        </button>
      </div>
    </div>
  );
}

/* ── AddVehicleModal ────────────────────────────────────────────────────────── */

function AddVehicleModal({ onClose, onAdd }: Readonly<{ onClose: () => void; onAdd: (v: Vehicle) => void }>) {
  const [plate, setPlate] = useState('');
  const [loading, setLoading] = useState(false);
  const [vehicleData, setVehicleData] = useState<VehicleData | null>(null);
  const [insuranceData, setInsuranceData] = useState<InsuranceData | null>(null);
  const [nickname, setNickname] = useState('');
  const [rfid, setRfid] = useState('');
  const [isEV, setIsEV] = useState(false);
  const [isAccessible, setIsAccessible] = useState(false);
  const [chargerTypes, setChargerTypes] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, []);

  useEffect(() => {
    const normalized = plate.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (normalized !== plate) setPlate(normalized);
  }, [plate]);

  useEffect(() => {
    if (!PT_PLATE_REGEX.test(plate)) { setVehicleData(null); setInsuranceData(null); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setLoading(true);
      Promise.all([
        lookupVehicleData(plate),
        lookupInsuranceData(plate),
      ])
        .then(([vData, iData]) => {
          setVehicleData(vData);
          setInsuranceData(iData);
          const ev = isEVFuelType(vData.fuelType);
          setIsEV(ev);
          if (ev) setChargerTypes(detectChargerTypes(vData.make));
        })
        .catch((err) => { toast.error(err.message || 'Erro ao obter dados do veículo'); setVehicleData(null); })
        .finally(() => setLoading(false));
    }, 600);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [plate]);

  const handleIsEVChange = (checked: boolean) => {
    setIsEV(checked);
    if (checked) setChargerTypes(detectChargerTypes(vehicleData?.make));
    else setChargerTypes([]);
  };

  const handleAdd = () => {
    if (!PT_PLATE_REGEX.test(plate)) { toast.error('Matrícula inválida'); return; }
    onAdd({
      id: Date.now().toString(),
      plate,
      nickname: nickname.trim() || undefined,
      make: vehicleData?.make,
      model: vehicleData?.model,
      version: vehicleData?.version,
      year: vehicleData?.plateDate,
      color: vehicleData?.color,
      fuelType: vehicleData?.fuelType,
      vin: vehicleData?.vin,
      powerKW: vehicleData?.powerkw,
      isEV,
      chargerTypes: isEV ? chargerTypes : undefined,
      isAccessible,
      isPrimary: false,
      rfid: rfid.trim() || undefined,
    });
    toast.success('Veículo adicionado com sucesso');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-background border-b border-border px-5 py-4 flex items-center justify-between rounded-t-3xl">
          <h2 className="text-foreground font-extrabold" style={{ fontSize: '1.2rem' }}>Adicionar Veículo</h2>
          <button type="button" aria-label="Fechar" onClick={onClose} className="w-8 h-8 rounded-full hover:bg-muted transition-colors flex items-center justify-center">
            <i className="fas fa-times text-muted-foreground" style={{ fontSize: '0.9rem' }} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <PlateInput plate={plate} setPlate={setPlate} loading={loading} inputRef={inputRef} />
          <NicknameInput nickname={nickname} setNickname={setNickname} />
          <RfidInput rfid={rfid} setRfid={setRfid} />

          {vehicleData && <VehicleDataCard vehicleData={vehicleData} insuranceData={insuranceData} />}

          <EVOptions
            isEV={isEV}
            setIsEV={handleIsEVChange}
            chargerTypes={chargerTypes}
            setChargerTypes={setChargerTypes}
            isAccessible={isAccessible}
            setIsAccessible={setIsAccessible}
          />
        </div>

        <div className="sticky bottom-0 bg-background border-t border-border px-5 py-4 flex items-center gap-3 rounded-b-3xl">
          <button onClick={onClose} className="btn btn-ghost flex-1 rounded-full" style={{ fontSize: '0.875rem' }}>Cancelar</button>
          <button onClick={handleAdd} disabled={!PT_PLATE_REGEX.test(plate)} className="btn btn-primary flex-1 rounded-full" style={{ fontSize: '0.875rem' }}>
            <i className="fas fa-plus mr-2" style={{ fontSize: '0.8rem' }} />
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── AddVehicleModal sub-components ─────────────────────────────────────────── */

function PlateInput({
  plate, setPlate, loading, inputRef,
}: { plate: string; setPlate: (v: string) => void; loading: boolean; inputRef: React.RefObject<HTMLInputElement | null> }) {
  return (
    <div>
      <label htmlFor="plate-input" className="block text-foreground font-bold mb-2" style={{ fontSize: '0.875rem' }}>
        Matrícula <span className="text-error">*</span>
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id="plate-input"
          type="text"
          value={plate}
          onChange={(e) => setPlate(e.target.value.toUpperCase())}
          placeholder="XX-XX-XX"
          maxLength={8}
          className="input input-bordered w-full rounded-xl font-mono"
          style={{ fontSize: '0.95rem', letterSpacing: '0.1em' }}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <i className="fas fa-spinner fa-spin text-primary" style={{ fontSize: '0.9rem' }} />
          </div>
        )}
      </div>
      <p className="text-muted-foreground mt-1" style={{ fontSize: '0.72rem' }}>Formato: AB-12-CD ou 12-AB-CD</p>
    </div>
  );
}

function NicknameInput({ nickname, setNickname }: { nickname: string; setNickname: (v: string) => void }) {
  return (
    <div>
      <label htmlFor="nickname-input" className="block text-foreground font-bold mb-2" style={{ fontSize: '0.875rem' }}>
        Alcunha (opcional)
      </label>
      <input
        id="nickname-input"
        type="text"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        placeholder="Ex: Tesla da família, Carro da empresa..."
        className="input input-bordered w-full rounded-xl"
        style={{ fontSize: '0.875rem' }}
      />
    </div>
  );
}

function RfidInput({ rfid, setRfid }: { rfid: string; setRfid: (v: string) => void }) {
  return (
    <div>
      <label htmlFor="rfid-input" className="block text-foreground font-bold mb-2" style={{ fontSize: '0.875rem' }}>
        Identificador Via Verde / RFID (opcional)
      </label>
      <div className="relative">
        <i className="fas fa-id-card absolute left-3 top-1/2 -translate-y-1/2 text-primary" style={{ fontSize: '0.85rem' }} />
        <input
          id="rfid-input"
          type="text"
          value={rfid}
          onChange={(e) => setRfid(e.target.value)}
          placeholder="Ex: VV-123456789"
          className="input input-bordered w-full rounded-xl pl-9"
          style={{ fontSize: '0.875rem' }}
        />
      </div>
      <p className="text-muted-foreground mt-1" style={{ fontSize: '0.72rem' }}>Usado para identificação automática na entrada/saída</p>
    </div>
  );
}

function VehicleDataCard({ vehicleData, insuranceData }: { vehicleData: VehicleData; insuranceData: InsuranceData | null }) {
  return (
    <div className="rounded-xl bg-muted p-4 space-y-2">
      <div className="flex items-center justify-between mb-2">
        <p className="text-foreground font-bold" style={{ fontSize: '0.875rem' }}>
          <i className="fas fa-check-circle text-success mr-2" style={{ fontSize: '0.85rem' }} />
          Dados encontrados
        </p>
        {vehicleData.make && (
          <div className="w-8 h-8">
            <BrandLogo make={vehicleData.make} />
          </div>
        )}
      </div>
      {[
        vehicleData.make && vehicleData.model ? { label: 'Marca/Modelo', value: `${vehicleData.make} ${vehicleData.model}` } : null,
        vehicleData.version ? { label: 'Versão', value: vehicleData.version } : null,
        vehicleData.plateDate ? { label: 'Ano', value: vehicleData.plateDate.slice(0, 4) } : null,
        vehicleData.fuelType ? { label: 'Combustível', value: vehicleData.fuelType } : null,
        vehicleData.powerkw ? { label: 'Potência', value: `${vehicleData.powerkw} kW` } : null,
        vehicleData.color ? { label: 'Cor', value: vehicleData.color } : null,
      ].filter(Boolean).map((item) => (
        <div key={item!.label} className="flex justify-between text-sm">
          <span className="text-muted-foreground">{item!.label}:</span>
          <span className="text-foreground font-semibold">{item!.value}</span>
        </div>
      ))}
      {insuranceData && (
        <div className="mt-3 pt-3 border-t border-border space-y-1.5">
          <p className="text-foreground font-bold" style={{ fontSize: '0.8rem' }}>
            <i className="fas fa-shield-halved text-primary mr-2" style={{ fontSize: '0.78rem' }} />
            Seguro
          </p>
          {insuranceData.entity && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Seguradora:</span>
              <span className="text-foreground font-semibold">{insuranceData.entity}</span>
            </div>
          )}
          {insuranceData.policy && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Apólice:</span>
              <span className="text-foreground font-semibold font-mono">{insuranceData.policy}</span>
            </div>
          )}
          {insuranceData.endDate && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Válido até:</span>
              <span className="text-foreground font-semibold">{insuranceData.endDate}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EVOptions({
  isEV, setIsEV, chargerTypes, setChargerTypes, isAccessible, setIsAccessible,
}: {
  isEV: boolean; setIsEV: (v: boolean) => void;
  chargerTypes: string[]; setChargerTypes: (v: string[]) => void;
  isAccessible: boolean; setIsAccessible: (v: boolean) => void;
}) {
  const allChargerTypes = ['Type 2', 'CCS', 'CHAdeMO', 'Tesla Supercharger'];

  const toggleCharger = (type: string) => {
    setChargerTypes(chargerTypes.includes(type)
      ? chargerTypes.filter((t) => t !== type)
      : [...chargerTypes, type]);
  };

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 cursor-pointer transition-colors">
        <input type="checkbox" checked={isEV} onChange={(e) => setIsEV(e.target.checked)} className="checkbox checkbox-primary checkbox-sm" />
        <div className="flex-1">
          <p className="text-foreground font-semibold" style={{ fontSize: '0.875rem' }}>
            <i className="fas fa-bolt text-green-500 mr-2" style={{ fontSize: '0.8rem' }} />
            Veículo Elétrico
          </p>
          <p className="text-muted-foreground" style={{ fontSize: '0.72rem' }}>Priorizar lugares com carregadores EV</p>
        </div>
      </label>

      {isEV && (
        <div className="pl-3 pr-3 pb-3 rounded-xl border border-green-500/20 bg-green-500/5 -mt-1 pt-2">
          <p className="text-foreground font-semibold mb-2" style={{ fontSize: '0.78rem' }}>Tipos de carregador compatíveis:</p>
          <div className="flex flex-wrap gap-1.5">
            {allChargerTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => toggleCharger(type)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold transition-colors ${
                  chargerTypes.includes(type)
                    ? 'bg-green-500/20 border-green-500 text-green-600'
                    : 'border-border text-muted-foreground hover:border-green-500/50'
                }`}
              >
                <i className={`fas ${CHARGER_ICONS[type] ?? 'fa-plug'}`} style={{ fontSize: '0.65rem' }} />
                {type}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 cursor-pointer transition-colors">
        <input type="checkbox" checked={isAccessible} onChange={(e) => setIsAccessible(e.target.checked)} className="checkbox checkbox-primary checkbox-sm" />
        <div className="flex-1">
          <p className="text-foreground font-semibold" style={{ fontSize: '0.875rem' }}>
            <i className="fas fa-wheelchair text-blue-500 mr-2" style={{ fontSize: '0.8rem' }} />
            Veículo Acessível
          </p>
          <p className="text-muted-foreground" style={{ fontSize: '0.72rem' }}>Necessita de lugares para mobilidade reduzida</p>
        </div>
      </label>
    </div>
  );
}

/* ── EditVehicleModal ───────────────────────────────────────────────────────── */

function EditVehicleModal({
  vehicle, onClose, onUpdate,
}: Readonly<{ vehicle: Vehicle; onClose: () => void; onUpdate: (updates: Partial<Vehicle>) => void }>) {
  const [nickname, setNickname] = useState(vehicle.nickname || '');
  const [rfid, setRfid] = useState(vehicle.rfid || '');
  const [isEV, setIsEV] = useState(vehicle.isEV);
  const [isAccessible, setIsAccessible] = useState(vehicle.isAccessible);
  const [chargerTypes, setChargerTypes] = useState<string[]>(vehicle.chargerTypes || []);

  const handleIsEVChange = (checked: boolean) => {
    setIsEV(checked);
    if (checked && chargerTypes.length === 0) setChargerTypes(detectChargerTypes(vehicle.make));
    if (!checked) setChargerTypes([]);
  };

  const handleSave = () => {
    onUpdate({
      nickname: nickname.trim() || undefined,
      rfid: rfid.trim() || undefined,
      isEV,
      chargerTypes: isEV ? chargerTypes : undefined,
      isAccessible,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="border-b border-border px-5 py-4 flex items-center justify-between rounded-t-3xl">
          <h2 className="text-foreground font-extrabold" style={{ fontSize: '1.2rem' }}>Editar Veículo</h2>
          <button type="button" aria-label="Fechar" onClick={onClose} className="w-8 h-8 rounded-full hover:bg-muted transition-colors flex items-center justify-center">
            <i className="fas fa-times text-muted-foreground" style={{ fontSize: '0.9rem' }} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <div>
            <label className="block text-muted-foreground font-bold mb-2" style={{ fontSize: '0.875rem' }}>Matrícula</label>
            <div className="input input-bordered w-full rounded-xl bg-muted cursor-not-allowed font-mono flex items-center" style={{ fontSize: '0.95rem', letterSpacing: '0.1em' }}>
              {vehicle.plate}
            </div>
          </div>

          {(vehicle.make || vehicle.model || vehicle.fuelType) && (
            <div className="rounded-xl bg-muted p-4 space-y-1.5">
              <div className="flex items-center gap-3 mb-2">
                <BrandLogo make={vehicle.make} />
                <p className="text-foreground font-bold" style={{ fontSize: '0.875rem' }}>Informações do Veículo</p>
              </div>
              {vehicle.make && vehicle.model && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Marca/Modelo:</span>
                  <span className="text-foreground font-semibold">{vehicle.make} {vehicle.model}</span>
                </div>
              )}
              {vehicle.fuelType && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Combustível:</span>
                  <span className="text-foreground font-semibold">{vehicle.fuelType}</span>
                </div>
              )}
              {vehicle.color && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cor:</span>
                  <span className="text-foreground font-semibold">{vehicle.color}</span>
                </div>
              )}
            </div>
          )}

          <NicknameInput nickname={nickname} setNickname={setNickname} />
          <RfidInput rfid={rfid} setRfid={setRfid} />
          <EVOptions
            isEV={isEV}
            setIsEV={handleIsEVChange}
            chargerTypes={chargerTypes}
            setChargerTypes={setChargerTypes}
            isAccessible={isAccessible}
            setIsAccessible={setIsAccessible}
          />
        </div>

        <div className="border-t border-border px-5 py-4 flex items-center gap-3 rounded-b-3xl">
          <button onClick={onClose} className="btn btn-ghost flex-1 rounded-full" style={{ fontSize: '0.875rem' }}>Cancelar</button>
          <button onClick={handleSave} className="btn btn-primary flex-1 rounded-full" style={{ fontSize: '0.875rem' }}>
            <i className="fas fa-save mr-2" style={{ fontSize: '0.8rem' }} />
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── DeleteVehicleDialog ────────────────────────────────────────────────────── */

function DeleteVehicleDialog({
  vehicle, onClose, onConfirm,
}: Readonly<{ vehicle: Vehicle; onClose: () => void; onConfirm: () => void }>) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background rounded-3xl w-full max-w-sm shadow-2xl">
        <div className="px-5 pt-5 pb-3 text-center">
          <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-3">
            <i className="fas fa-exclamation-triangle text-error" style={{ fontSize: '1.5rem' }} />
          </div>
          <h2 className="text-foreground font-extrabold mb-2" style={{ fontSize: '1.2rem' }}>Remover Veículo?</h2>
          <p className="text-muted-foreground" style={{ fontSize: '0.875rem' }}>
            Tens a certeza que desejas remover o veículo <strong className="text-foreground">{vehicle.plate}</strong>?
            Esta ação não pode ser revertida.
          </p>
        </div>
        <div className="border-t border-border px-5 py-4 flex items-center gap-3">
          <button onClick={onClose} className="btn btn-ghost flex-1 rounded-full" style={{ fontSize: '0.875rem' }}>Cancelar</button>
          <button onClick={onConfirm} className="btn bg-error hover:bg-error/90 text-white border-none flex-1 rounded-full" style={{ fontSize: '0.875rem' }}>
            <i className="fas fa-trash mr-2" style={{ fontSize: '0.8rem' }} />
            Remover
          </button>
        </div>
      </div>
    </div>
  );
}
