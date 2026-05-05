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
  const [plateError, setPlateError] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualData, setManualData] = useState<{ make: string; model: string; fuelType: string; year: string }>({
    make: '',
    model: '',
    fuelType: '',
    year: '',
  });
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
    if (!PT_PLATE_REGEX.test(plate)) {
      setVehicleData(null);
      setInsuranceData(null);
      setPlateError(null);
      setShowManualForm(false);
      setManualData({ make: '', model: '', fuelType: '', year: '' });
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      setPlateError(null);
      setShowManualForm(false);
      Promise.all([lookupVehicleData(plate), lookupInsuranceData(plate)])
        .then(([vData, iData]) => {
          setVehicleData(vData);
          setInsuranceData(iData);
          setManualData({
            make: vData.make ?? '',
            model: vData.model ?? '',
            fuelType: vData.fuelType ?? '',
            year: vData.plateDate ? vData.plateDate.slice(0, 4) : '',
          });
          const ev = isEVFuelType(vData.fuelType);
          setIsEV(ev);
          if (ev) setChargerTypes(detectChargerTypes(vData.make));
        })
        .catch((error: unknown) => {
          setVehicleData(null);
          setInsuranceData(null);
          setShowManualForm(true);
          const msg = error instanceof Error ? error.message : 'Falha na consulta do InfoMatrícula';
          setPlateError(msg);
          console.warn('[Vehicle lookup] InfoMatrícula lookup failed:', msg);
        })
        .finally(() => setLoading(false));
    }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [plate]);

  const handleAdd = async () => {
    if (!PT_PLATE_REGEX.test(plate)) { toast.error('Matrícula inválida'); return; }
    const yearFromLookup = vehicleData?.plateDate ? parseInt(vehicleData.plateDate.slice(0, 4), 10) : undefined;
    const hasValidManualData =
      manualData.make.trim().length > 0 &&
      manualData.model.trim().length > 0 &&
      manualData.fuelType.trim().length > 0 &&
      Number.isInteger(parseInt(manualData.year, 10));

    if (!vehicleData && !hasValidManualData) {
      setShowManualForm(true);
      toast.warning('Sem resposta do InfoMatrícula. Preencha os dados manuais para continuar.');
      return;
    }

    setSaving(true);
    try {
      const created = await vehicleApi.create({
        licensePlate: plate,
        externalIdentifier: rfid.trim() || undefined,
        make: vehicleData?.make ?? (manualData.make.trim() || undefined),
        model: vehicleData?.model ?? (manualData.model.trim() || undefined),
        fuelType: vehicleData?.fuelType ?? (manualData.fuelType.trim() || undefined),
        year: yearFromLookup ?? (parseInt(manualData.year, 10) || undefined),
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
          {plateError && PT_PLATE_REGEX.test(plate) && (
            <div className="rounded-xl border border-error/30 bg-error/5 p-3 text-sm text-error">
              Falha na consulta automática: {plateError}
            </div>
          )}
          <NicknameInput nickname={nickname} setNickname={setNickname} />
          <RfidInput rfid={rfid} setRfid={setRfid} />
          {vehicleData && <VehicleDataCard vehicleData={vehicleData} insuranceData={insuranceData} />}
          {showManualForm && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
              <p className="text-foreground font-semibold text-sm">Preenchimento manual (fallback)</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="input input-bordered rounded-lg"
                  placeholder="Marca"
                  value={manualData.make}
                  onChange={(e) => setManualData((prev) => ({ ...prev, make: e.target.value }))}
                />
                <input
                  className="input input-bordered rounded-lg"
                  placeholder="Modelo"
                  value={manualData.model}
                  onChange={(e) => setManualData((prev) => ({ ...prev, model: e.target.value }))}
                />
                <input
                  className="input input-bordered rounded-lg"
                  placeholder="Combustível"
                  value={manualData.fuelType}
                  onChange={(e) => setManualData((prev) => ({ ...prev, fuelType: e.target.value }))}
                />
                <input
                  className="input input-bordered rounded-lg"
                  placeholder="Ano"
                  value={manualData.year}
                  onChange={(e) => setManualData((prev) => ({ ...prev, year: e.target.value }))}
                />
              </div>
            </div>
          )}
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
