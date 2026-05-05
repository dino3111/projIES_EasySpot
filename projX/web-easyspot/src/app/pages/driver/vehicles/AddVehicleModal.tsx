import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { lookupVehicleData, lookupInsuranceData, type VehicleData, type InsuranceData } from '../../../../services/vehicleLookup';
import { vehicleApi } from '../../../../services/apiService';
import { isEVFuelType, detectChargerTypes } from '../../../utils/brandLogo';
import type { Vehicle } from '../../../context/ProfileContext';
import { PT_PLATE_REGEX, NicknameInput, RfidInput, VehicleDataCard, EVOptions } from './vehiclesShared';

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

export function AddVehicleModal({ onClose, onAdd }: Readonly<{ onClose: () => void; onAdd: (v: Vehicle) => void }>) {
  const [plate, setPlate] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
      Promise.all([lookupVehicleData(plate), lookupInsuranceData(plate)])
        .then(([vData, iData]) => {
          setVehicleData(vData);
          setInsuranceData(iData);
          const ev = isEVFuelType(vData.fuelType);
          setIsEV(ev);
          if (ev) setChargerTypes(detectChargerTypes(vData.make));
        })
        .catch(() => { setVehicleData(null); setInsuranceData(null); })
        .finally(() => setLoading(false));
    }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [plate]);

  const handleAdd = async () => {
    if (!PT_PLATE_REGEX.test(plate)) { toast.error('Matrícula inválida'); return; }
    setSaving(true);
    try {
      const created = await vehicleApi.create({
        licensePlate: plate,
        externalIdentifier: rfid.trim() || undefined,
        make: vehicleData?.make,
        model: vehicleData?.model,
        fuelType: vehicleData?.fuelType,
        year: vehicleData?.plateDate ? parseInt(vehicleData.plateDate.slice(0, 4), 10) : undefined,
      });
      onAdd({
        id: created.id,
        plate: created.plate,
        nickname: nickname.trim() || undefined,
        make: created.make ?? undefined,
        model: created.model ?? undefined,
        version: created.version ?? undefined,
        year: created.year ? String(created.year) : undefined,
        color: created.color ?? undefined,
        fuelType: created.fuelType ?? undefined,
        isEV: created.isEv,
        isAccessible,
        isPrimary: created.isPrimary,
        rfid: rfid.trim() || undefined,
      });
      toast.success('Veículo adicionado com sucesso');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao adicionar veículo');
    } finally {
      setSaving(false);
    }
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
            isEV={isEV} setIsEV={setIsEV}
            chargerTypes={chargerTypes} setChargerTypes={setChargerTypes}
            isAccessible={isAccessible} setIsAccessible={setIsAccessible}
            make={vehicleData?.make}
          />
        </div>
        <div className="sticky bottom-0 bg-background border-t border-border px-5 py-4 flex items-center gap-3 rounded-b-3xl">
          <button onClick={onClose} className="btn btn-ghost flex-1 rounded-full" style={{ fontSize: '0.875rem' }}>Cancelar</button>
          <button onClick={handleAdd} disabled={!PT_PLATE_REGEX.test(plate) || saving} className="btn btn-primary flex-1 rounded-full" style={{ fontSize: '0.875rem' }}>
            {saving ? <i className="fas fa-spinner fa-spin mr-2" style={{ fontSize: '0.8rem' }} /> : <i className="fas fa-plus mr-2" style={{ fontSize: '0.8rem' }} />}
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}
