import { useState } from 'react';
import { detectChargerTypes } from '../../../utils/brandLogo';
import type { Vehicle } from '../../../context/ProfileContext';
import { BrandLogo, NicknameInput, RfidInput, EVOptions } from './veiculosShared';

export function EditVehicleModal({
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

  const handleSave = () =>
    onUpdate({
      nickname: nickname.trim() || undefined,
      rfid: rfid.trim() || undefined,
      isEV,
      chargerTypes: isEV ? chargerTypes : undefined,
      isAccessible,
    });

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
            isEV={isEV} setIsEV={handleIsEVChange}
            chargerTypes={chargerTypes} setChargerTypes={setChargerTypes}
            isAccessible={isAccessible} setIsAccessible={setIsAccessible}
            make={vehicle.make}
          />
        </div>
        <div className="border-t border-border px-5 py-4 flex items-center gap-3 rounded-b-3xl">
          <button onClick={onClose} className="btn btn-ghost flex-1 rounded-full" style={{ fontSize: '0.875rem' }}>Cancelar</button>
          <button onClick={handleSave} className="btn btn-primary flex-1 rounded-full" style={{ fontSize: '0.875rem' }}>
            <i className="fas fa-save mr-2" style={{ fontSize: '0.8rem' }} />Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
