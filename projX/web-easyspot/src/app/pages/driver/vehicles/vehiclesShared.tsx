import { useState } from 'react';
import { getBrandLogoUrl, detectChargerTypes } from '../../../utils/brandLogo';
import type { VehicleData, InsuranceData } from '../../../../services/vehicleLookup';

export const PT_PLATE_REGEX = /^[A-Z0-9]{2}-[A-Z0-9]{2}-[A-Z0-9]{2}$/;

export const CHARGER_ICONS: Record<string, string> = {
  'Type 2': 'fa-plug',
  'CCS': 'fa-bolt',
  'CHAdeMO': 'fa-charging-station',
  'Tesla Supercharger': 'fa-bolt-lightning',
};

export function BrandLogo({ make }: { make?: string }) {
  const url = getBrandLogoUrl(make);
  const [failed, setFailed] = useState(false);
  if (!url || failed) return <i className="fas fa-car text-muted-foreground" style={{ fontSize: '1.4rem' }} />;
  return <img src={url} alt={make} className="w-10 h-10 object-contain" onError={() => setFailed(true)} />;
}

export function NicknameInput({ nickname, setNickname }: { nickname: string; setNickname: (v: string) => void }) {
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

export function RfidInput({ rfid, setRfid }: { rfid: string; setRfid: (v: string) => void }) {
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

export function VehicleDataCard({ vehicleData, insuranceData }: { vehicleData: VehicleData; insuranceData: InsuranceData | null }) {
  return (
    <div className="rounded-xl bg-muted p-4 space-y-2">
      <div className="flex items-center justify-between mb-2">
        <p className="text-foreground font-bold" style={{ fontSize: '0.875rem' }}>
          <i className="fas fa-check-circle text-success mr-2" style={{ fontSize: '0.85rem' }} />
          Dados encontrados
        </p>
        {vehicleData.make && <div className="w-8 h-8"><BrandLogo make={vehicleData.make} /></div>}
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
            <i className="fas fa-shield-halved text-primary mr-2" style={{ fontSize: '0.78rem' }} />Seguro
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

export function EVOptions({
  isEV, setIsEV, chargerTypes, setChargerTypes, isAccessible, setIsAccessible, make,
}: {
  isEV: boolean; setIsEV: (v: boolean) => void;
  chargerTypes: string[]; setChargerTypes: (v: string[]) => void;
  isAccessible: boolean; setIsAccessible: (v: boolean) => void;
  make?: string;
}) {
  const allChargerTypes = ['Type 2', 'CCS', 'CHAdeMO', 'Tesla Supercharger'];

  const toggleCharger = (type: string) =>
    setChargerTypes(chargerTypes.includes(type) ? chargerTypes.filter((t) => t !== type) : [...chargerTypes, type]);

  const handleIsEVChange = (checked: boolean) => {
    setIsEV(checked);
    if (checked) setChargerTypes(detectChargerTypes(make));
    else setChargerTypes([]);
  };

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 cursor-pointer transition-colors">
        <input type="checkbox" checked={isEV} onChange={(e) => handleIsEVChange(e.target.checked)} className="checkbox checkbox-primary checkbox-sm" />
        <div className="flex-1">
          <p className="text-foreground font-semibold" style={{ fontSize: '0.875rem' }}>
            <i className="fas fa-bolt text-green-500 mr-2" style={{ fontSize: '0.8rem' }} />Veículo Elétrico
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
            <i className="fas fa-wheelchair text-blue-500 mr-2" style={{ fontSize: '0.8rem' }} />Veículo Acessível
          </p>
          <p className="text-muted-foreground" style={{ fontSize: '0.72rem' }}>Necessita de lugares para mobilidade reduzida</p>
        </div>
      </label>
    </div>
  );
}
