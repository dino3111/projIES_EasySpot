import React, { useState } from 'react';
import type { AppProfile, DriverType } from '../../../context/ProfileContext';
import { getBrandLogoUrl } from '../../../utils/brandLogo';

export interface VehicleData {
  plate?: string;
  make?: string;
  model?: string;
  version?: string;
  plateDate?: string;
  color?: string;
  fuelType?: string;
  yearFrom?: number;
  yearTo?: number;
  bodyType?: string;
  powerKw?: number;
  displacementCc?: number;
  imageUrl?: string;
  brandLogoUrl?: string;
  [key: string]: unknown;
}

export interface InsuranceData {
  entity?: string;
  policy?: string;
  endDate?: string;
}

export const INPUT_CLS = 'w-full rounded-xl px-4 py-3 bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all';

const PT_PLATE_REGEX = /^[A-Z0-9]{2}-[A-Z0-9]{2}-[A-Z0-9]{2}$/;

function VehicleBrandLogo({ make, logoUrl }: Readonly<{ make?: string; logoUrl?: string }>) {
  const url = logoUrl ?? getBrandLogoUrl(make);
  const [failed, setFailed] = useState(false);
  if (!url || failed) return null;
  return <img src={url} alt={make} className="w-8 h-8 object-contain" onError={() => setFailed(true)} />;
}

export function VehicleFieldGroup({ label, fields }: { label?: string; fields: { label: string; value: string | undefined }[] }) {
  const visible = fields.filter((f) => f.value?.trim());
  if (visible.length === 0) return null;
  return (
    <div>
      {label && <p className="text-muted-foreground font-semibold mb-1.5" style={{ fontSize: '0.67rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {visible.map((f) => (
          <div key={f.label}>
            <p className="text-muted-foreground" style={{ fontSize: '0.67rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</p>
            <p className="text-foreground font-semibold" style={{ fontSize: '0.8rem' }}>{f.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StepAccountType({ accountType, onSet }: {
  accountType: AppProfile;
  onSet: (t: AppProfile) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-muted-foreground mb-4" style={{ fontSize: '0.82rem' }}>Selecione o tipo de conta para personalizar a sua experiência.</p>
      {([
        { id: 'DRIVER',     icon: 'fa-car',       label: 'Condutor',                 desc: 'Encontrar parques, reservar, gerir custos' },
        { id: 'MANAGER',    icon: 'fa-chart-pie',  label: 'Gestor de Parques',         desc: 'Dashboard, receitas, sensores, relatórios' },
        { id: 'TECHNICAL', icon: 'fa-wrench',     label: 'Técnico de Manutenção',     desc: 'Diagnóstico, ordens de manutenção, sensores' },
      ] as { id: AppProfile; icon: string; label: string; desc: string }[]).map((t) => (
        <button key={t.id} onClick={() => onSet(t.id)} className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${accountType === t.id ? 'border-primary bg-primary/8' : 'border-border hover:border-primary/40'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accountType === t.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            <i className={`fas ${t.icon}`} style={{ fontSize: '1rem' }} />
          </div>
          <div className="flex-1">
            <p className={`font-bold ${accountType === t.id ? 'text-primary' : 'text-foreground'}`} style={{ fontSize: '0.875rem' }}>{t.label}</p>
            <p className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>{t.desc}</p>
          </div>
          {accountType === t.id && <i className="fas fa-circle-check text-primary" />}
        </button>
      ))}
    </div>
  );
}

export function StepVehicle(props: {
  plate: string;
  setPlate: (v: string) => void;  plateLoading: boolean;
  vehicleData: Partial<VehicleData> | null;
  insuranceData: InsuranceData | null;
  plateError: string | null;
  manualVehicleData: Record<string, unknown>;
  setManualVehicleData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  showManualVehicleForm: boolean;
  setShowManualVehicleForm: React.Dispatch<React.SetStateAction<boolean>>;
  onSaveManual?: () => void;
  savingManual?: boolean;
}) {
  const { plate, setPlate, plateLoading, vehicleData, insuranceData, plateError, manualVehicleData, setManualVehicleData, showManualVehicleForm, setShowManualVehicleForm, onSaveManual, savingManual } = props;
  return (
    <div className="space-y-4">
    </div>
  );
}

export function StepAccess({ accountType }: { accountType: AppProfile }) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground mb-2" style={{ fontSize: '0.82rem' }}>Configure o seu acesso à plataforma de {accountType === 'MANAGER' ? 'gestão' : 'manutenção'}.</p>
    </div>
  );
}

export function StepPayment(props: {
  payMethod: 'card' | 'mbway' | 'mb';
  setPayMethod: (v: 'card' | 'mbway' | 'mb') => void;
  cardN: string; setCardN: (v: string) => void;
  cardExpiry: string; setCardExpiry: (v: string) => void;
  cardCvv: string; setCardCvv: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
}) {
  const { payMethod, setPayMethod, cardN, setCardN, cardExpiry, setCardExpiry, cardCvv, setCardCvv, phone, setPhone } = props;
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground mb-1" style={{ fontSize: '0.82rem' }}>O pagamento é processado automaticamente pelo <strong>Stripe</strong> à saída do parque, sem necessidade de interação.</p>
      <div className="grid grid-cols-3 gap-2">
        {([
          { id: 'card', icon: 'fa-credit-card', label: 'Cartão' },
          { id: 'mbway', icon: 'fa-mobile-screen', label: 'MB Way' },
          { id: 'mb', icon: 'fa-money-bill', label: 'Multibanco' },
        ] as { id: typeof payMethod; icon: string; label: string }[]).map((m) => (
          <button key={m.id} onClick={() => setPayMethod(m.id)} className={`py-2.5 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${payMethod === m.id ? 'border-primary bg-primary/8' : 'border-border hover:border-primary/40'}`}>
            <i className={`fas ${m.icon}`} style={{ fontSize: '1rem', color: payMethod === m.id ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }} />
            <span className={`font-semibold ${payMethod === m.id ? 'text-primary' : 'text-muted-foreground'}`} style={{ fontSize: '0.72rem' }}>{m.label}</span>
          </button>
        ))}
      </div>
      {payMethod === 'card' && (
        <div className="space-y-3">
          <input type="text" placeholder="Número do cartão" value={cardN} onChange={(e) => setCardN(e.target.value)} className={INPUT_CLS} />
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="MM/AA" value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} className={INPUT_CLS} />
            <input type="text" placeholder="CVV" value={cardCvv} onChange={(e) => setCardCvv(e.target.value)} className={INPUT_CLS} />
          </div>
        </div>
      )}
      {payMethod === 'mbway' && (
        <input type="tel" placeholder="+351 912 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} className={INPUT_CLS} />
      )}
      {payMethod === 'mb' && (
        <div className="p-3 rounded-xl bg-muted/40 border border-border text-sm text-muted-foreground">
          Será enviada uma referência Multibanco após cada sessão.
        </div>
      )}
    </div>
  );
}

export function StepDriverType({ driverType, setDriverType }: { driverType: DriverType; setDriverType: (v: DriverType) => void }) {
  return (
    <div className="space-y-3">
      {([
        { id: 'regular', label: 'Regular', icon: 'fa-user' },
        { id: 'student', label: 'Estudante', icon: 'fa-graduation-cap' },
        { id: 'senior', label: 'Sénior', icon: 'fa-user-clock' },
        { id: 'disabled', label: 'Mobilidade reduzida', icon: 'fa-wheelchair' },
      ] as { id: DriverType; label: string; icon: string }[]).map((item) => (
        <button key={item.id} onClick={() => setDriverType(item.id)} className={`w-full p-3 rounded-xl border text-left ${driverType === item.id ? 'border-primary bg-primary/8' : 'border-border'}`}>
          <i className={`fas ${item.icon} mr-2`} />{item.label}
        </button>
      ))}
    </div>
  );
}

export function StepPreferences(props: {
  notifPush: boolean;
  setNotifPush: (v: boolean) => void;
  notifEmail: boolean;
  setNotifEmail: (v: boolean) => void;
}) {
  const { notifPush, setNotifPush, notifEmail, setNotifEmail } = props;
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={notifPush} onChange={(e) => setNotifPush(e.target.checked)} />
        <span>Notificações push</span>
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={notifEmail} onChange={(e) => setNotifEmail(e.target.checked)} />
        <span>Notificações por email</span>
      </label>
    </div>
  );
}

export function StepFinished({ accountType }: { accountType: AppProfile }) {
  return (
    <div className="text-center py-4">
      <div className="relative inline-block mb-5">
        <div className="w-20 h-20 rounded-full bg-success/15 flex items-center justify-center mx-auto">
          <i className="fas fa-check text-success" style={{ fontSize: '2rem' }} />
        </div>
        <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
          <i className="fas fa-square-parking text-primary-foreground" style={{ fontSize: '0.85rem' }} />
        </div>
      </div>
      <p className="text-foreground mb-1" style={{ fontSize: '1.3rem', fontWeight: 800 }}>Pronto! Bem-vindo ao EasySpot</p>
      <p className="text-muted-foreground mb-6" style={{ fontSize: '0.85rem' }}>A sua conta foi configurada com sucesso. Comece a explorar parques em tempo real.</p>
      <div className="space-y-2 text-left mb-4">
        {[
          { icon: 'fa-circle-check', color: 'text-success', text: 'Conta criada e verificada' },
          ...(accountType === 'DRIVER' ? [
            { icon: 'fa-circle-check', color: 'text-success', text: 'Veículo associado' },
            { icon: 'fa-circle-check', color: 'text-success', text: 'Método de pagamento configurado' },
          ] : [
            { icon: 'fa-circle-check', color: 'text-success', text: 'Acesso ao parque configurado' },
          ]),
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <i className={`fas ${item.icon} ${item.color}`} style={{ fontSize: '0.85rem' }} />
            <span className="text-foreground" style={{ fontSize: '0.82rem' }}>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
