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
  setPlate: (v: string) => void;
  rfid: string;
  setRfid: (v: string) => void;
  plateLoading: boolean;
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
  const { plate, setPlate, rfid, setRfid, plateLoading, vehicleData, insuranceData, plateError, manualVehicleData, setManualVehicleData, showManualVehicleForm, setShowManualVehicleForm, onSaveManual, savingManual } = props;
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-foreground font-semibold mb-1.5" style={{ fontSize: '0.8rem' }}>
          <i className="fas fa-car text-primary mr-1.5" />Matrícula do veículo <span className="text-error">*</span>
        </label>
        <div className="relative">
          <input
            type="text" placeholder="Ex: 22-AB-44" value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
            className={`${INPUT_CLS} font-mono tracking-widest uppercase pr-10`}
            style={{ fontSize: '0.9rem' }} maxLength={9} aria-label="Matrícula do veículo"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {plateLoading && <i className="fas fa-spinner fa-spin text-primary" style={{ fontSize: '0.9rem' }} aria-label="A consultar..." />}
            {!plateLoading && vehicleData && <i className="fas fa-circle-check text-success" style={{ fontSize: '0.9rem' }} aria-label="Veículo encontrado" />}
            {!plateLoading && plateError && PT_PLATE_REGEX.test(plate) && <i className="fas fa-circle-xmark text-error" style={{ fontSize: '0.9rem' }} aria-label="Erro na consulta" />}
          </div>
        </div>
        <p className="text-muted-foreground mt-1" style={{ fontSize: '0.72rem' }}>Formato: XX-XX-XX (ex: 22-AB-44). A consulta é automática ao inserir a matrícula.</p>
      </div>

      {vehicleData && !plateLoading && (
        <div className="rounded-xl border border-success/30 bg-success/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <i className="fas fa-circle-check text-success" style={{ fontSize: '0.85rem' }} />
            <p className="font-bold" style={{ fontSize: '0.82rem', color: '#22c55e' }}>Veículo identificado automaticamente</p>
          </div>
          <VehicleBrandLogo make={vehicleData.make} logoUrl={vehicleData.brandLogoUrl} />
          {vehicleData.imageUrl && (
            <img src={vehicleData.imageUrl} alt="Veículo identificado" className="w-full h-32 object-cover rounded-lg border border-border" />
          )}
          <VehicleFieldGroup fields={[
            { label: 'Marca', value: vehicleData.make }, { label: 'Modelo', value: vehicleData.model },
            { label: 'Versão', value: vehicleData.version }, { label: 'Cor', value: vehicleData.color },
            { label: 'Ano', value: vehicleData.yearFrom ? String(vehicleData.yearFrom) : vehicleData.plateDate?.split('/')[1] },
            { label: 'Até', value: vehicleData.yearTo ? String(vehicleData.yearTo) : undefined },
            { label: 'Combustível', value: vehicleData.fuelType }, { label: 'Carroceria', value: vehicleData.bodyType },
            { label: 'Potência (kW)', value: vehicleData.powerKw ? String(vehicleData.powerKw) : undefined },
            { label: 'Cilindrada (cc)', value: vehicleData.displacementCc ? String(vehicleData.displacementCc) : undefined },
          ]} />
          {insuranceData && (
            <VehicleFieldGroup label="Seguro" fields={[
              { label: 'Seguradora', value: insuranceData.entity },
              { label: 'Apólice', value: insuranceData.policy },
              { label: 'Válido até', value: insuranceData.endDate?.split(' ')[0] },
            ]} />
          )}
        </div>
      )}

      {plateError && !plateLoading && PT_PLATE_REGEX.test(plate) && (
        <div className="rounded-xl border border-error/30 bg-error/5 p-3.5 flex items-start gap-2.5">
          <i className="fas fa-triangle-exclamation text-error mt-0.5 flex-shrink-0" style={{ fontSize: '0.8rem' }} />
          <div>
            <p className="text-error font-semibold" style={{ fontSize: '0.78rem' }}>{plateError}</p>
            <p className="text-muted-foreground mt-0.5" style={{ fontSize: '0.72rem' }}>Pode continuar mesmo assim — a matrícula será verificada por OCR na entrada do parque.</p>
            <button type="button" onClick={() => setShowManualVehicleForm((prev) => !prev)} className="mt-2 text-primary font-semibold hover:underline" style={{ fontSize: '0.74rem' }}>
              {showManualVehicleForm ? 'Ocultar preenchimento manual' : 'Preencher dados do veículo manualmente'}
            </button>
          </div>
        </div>
      )}

      {showManualVehicleForm && (
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-3.5 space-y-3">
          <p className="text-foreground font-semibold" style={{ fontSize: '0.78rem' }}>Contorno temporário: introduza os dados manualmente enquanto a API externa está indisponível.</p>
          <div className="grid grid-cols-2 gap-2.5">
            <input type="text" placeholder="Marca" value={String(manualVehicleData.make || '')} onChange={(e) => setManualVehicleData((prev) => ({ ...prev, make: e.target.value }))} className={INPUT_CLS} style={{ fontSize: '0.8rem' }} />
            <input type="text" placeholder="Modelo" value={String(manualVehicleData.model || '')} onChange={(e) => setManualVehicleData((prev) => ({ ...prev, model: e.target.value }))} className={INPUT_CLS} style={{ fontSize: '0.8rem' }} />
            <input type="text" placeholder="Ano" value={String((manualVehicleData as Record<string, unknown>).year || '')} onChange={(e) => setManualVehicleData((prev) => ({ ...prev, year: e.target.value } as Partial<VehicleData>))} className={INPUT_CLS} style={{ fontSize: '0.8rem' }} />
            <input type="text" placeholder="Combustível" value={String((manualVehicleData as Record<string, unknown>).fuelType || '')} onChange={(e) => setManualVehicleData((prev) => ({ ...prev, fuelType: e.target.value } as Partial<VehicleData>))} className={INPUT_CLS} style={{ fontSize: '0.8rem' }} />
          </div>
          <button
            type="button"
            onClick={onSaveManual}
            disabled={savingManual}
            className="px-3 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50"
            style={{ fontSize: '0.76rem' }}
          >
            {savingManual ? <i className="fas fa-spinner fa-spin mr-1" /> : null}
            Guardar dados manuais
          </button>
        </div>
      )}

      <div>
        <label className="block text-foreground font-semibold mb-1.5" style={{ fontSize: '0.8rem' }}>
          <i className="fas fa-wifi text-primary mr-1.5" />Identificador RFID
          <span className="ml-1.5 text-muted-foreground font-normal" style={{ fontSize: '0.72rem' }}>(Opcional)</span>
        </label>
        <input type="text" placeholder="Ex: A3:F2:9C:B1" value={rfid} onChange={(e) => setRfid(e.target.value)} className={`${INPUT_CLS} font-mono`} style={{ fontSize: '0.875rem' }} />
      </div>
    </div>
  );
}

export function StepAccess({ accountType }: { accountType: AppProfile }) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground mb-2" style={{ fontSize: '0.82rem' }}>Configure o seu acesso à plataforma de {accountType === 'MANAGER' ? 'gestão' : 'manutenção'}.</p>
      <div>
        <label className="block text-foreground font-semibold mb-1.5" style={{ fontSize: '0.8rem' }}><i className="fas fa-building text-primary mr-1.5" />Código do parque / organização</label>
        <input type="text" placeholder="Ex: PARK-2026-ABC" className={INPUT_CLS} style={{ fontSize: '0.875rem' }} />
      </div>
      <div>
        <label className="block text-foreground font-semibold mb-1.5" style={{ fontSize: '0.8rem' }}><i className="fas fa-envelope text-primary mr-1.5" />E-mail de convite</label>
        <input type="email" placeholder="gestor@parque.pt" className={INPUT_CLS} style={{ fontSize: '0.875rem' }} />
      </div>
      <div className="p-3.5 rounded-xl bg-warning/8 border border-warning/25 flex items-start gap-2">
        <i className="fas fa-triangle-exclamation text-warning mt-0.5 flex-shrink-0" style={{ fontSize: '0.85rem' }} />
        <p className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>O acesso de {accountType === 'MANAGER' ? 'gestor' : 'técnico'} requer validação pela entidade responsável pelo parque.</p>
      </div>
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
          <div>
            <label className="block text-foreground font-semibold mb-1.5" style={{ fontSize: '0.8rem' }}>Número do cartão</label>
            <input type="text" placeholder="1234 5678 9012 3456" value={cardN} onChange={(e) => setCardN(e.target.value)} maxLength={19} className={`${INPUT_CLS} font-mono tracking-wider`} style={{ fontSize: '0.875rem' }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-foreground font-semibold mb-1.5" style={{ fontSize: '0.8rem' }}>Validade</label>
              <input type="text" placeholder="MM/AA" value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} maxLength={5} className={INPUT_CLS} style={{ fontSize: '0.875rem' }} />
            </div>
            <div>
              <label className="block text-foreground font-semibold mb-1.5" style={{ fontSize: '0.8rem' }}>CVV</label>
              <input type="text" placeholder="123" value={cardCvv} onChange={(e) => setCardCvv(e.target.value)} maxLength={4} className={INPUT_CLS} style={{ fontSize: '0.875rem' }} />
            </div>
          </div>
        </div>
      )}
      {payMethod === 'mbway' && (
        <div>
          <label className="block text-foreground font-semibold mb-1.5" style={{ fontSize: '0.8rem' }}>Número de telemóvel</label>
          <input type="tel" placeholder="+351 912 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} className={INPUT_CLS} style={{ fontSize: '0.875rem' }} />
        </div>
      )}
      {payMethod === 'mb' && (
        <div className="p-4 rounded-xl bg-muted/40 border border-border text-center">
          <i className="fas fa-info-circle text-muted-foreground mb-2" style={{ fontSize: '1.2rem' }} />
          <p className="text-muted-foreground" style={{ fontSize: '0.8rem' }}>Será enviada uma referência Multibanco por e-mail após cada sessão de estacionamento.</p>
        </div>
      )}
    </div>
  );
}

export function StepDriverType({ driverType, setDriverType }: { driverType: DriverType; setDriverType: (v: DriverType) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-muted-foreground mb-3" style={{ fontSize: '0.82rem' }}>Personalize a experiência. O perfil seleccionado activa filtros e recomendações automáticas.</p>
      {([
        { id: 'regular',           icon: 'fa-car',            color: '#7357ec', label: 'Condutor Regular',    desc: 'Prioridade por preço e distância. Veja a ocupação em tempo real e reserve em até 30 min.' },
        { id: 'ev',                icon: 'fa-charging-station', color: '#22c55e', label: 'Condutor EV',         desc: 'Filtragem por carregadores compatíveis, velocidade de carga e custo por kWh.' },
        { id: 'reduced_mobility', icon: 'fa-wheelchair',   color: '#0ea5e9', label: 'Mobilidade Reduzida', desc: 'Lugares acessíveis com dimensões, distância à entrada, vigilância e espaço para rampa.' },
      ] as { id: DriverType; icon: string; color: string; label: string; desc: string }[]).map((t) => (
        <button key={t.id} onClick={() => setDriverType(t.id)} className={`w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${driverType === t.id ? 'border-primary bg-primary/8' : 'border-border hover:border-primary/40'}`}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: driverType === t.id ? t.color : undefined }}>
            <i className={`fas ${t.icon} ${driverType === t.id ? 'text-white' : 'text-muted-foreground'}`} style={{ fontSize: '1rem' }} />
          </div>
          <div className="flex-1">
            <p className={`font-bold ${driverType === t.id ? 'text-primary' : 'text-foreground'}`} style={{ fontSize: '0.875rem' }}>{t.label}</p>
            <p className="text-muted-foreground mt-0.5" style={{ fontSize: '0.75rem', lineHeight: 1.4 }}>{t.desc}</p>
          </div>
          {driverType === t.id && <i className="fas fa-circle-check text-primary mt-0.5" />}
        </button>
      ))}
    </div>
  );
}

export function StepPreferences({ notifPush, setNotifPush, notifEmail, setNotifEmail }: {
  notifPush: boolean; setNotifPush: (v: boolean) => void;
  notifEmail: boolean; setNotifEmail: (v: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground mb-2" style={{ fontSize: '0.82rem' }}>Configure alertas e preferências de notificação.</p>
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <p className="text-foreground font-bold" style={{ fontSize: '0.85rem' }}><i className="fas fa-bell text-primary mr-2" />Notificações</p>
        {[
          { label: 'Alertas de disponibilidade', sub: 'Notificado quando há lugares livres no parque favorito', val: notifPush, set: setNotifPush },
          { label: 'Resumo por e-mail', sub: 'Relatório semanal de custos e deslocações', val: notifEmail, set: setNotifEmail },
        ].map((n) => (
          <div key={n.label} className="flex items-center justify-between gap-3">
            <div>
              <p className="text-foreground font-semibold" style={{ fontSize: '0.82rem' }}>{n.label}</p>
              <p className="text-muted-foreground" style={{ fontSize: '0.72rem' }}>{n.sub}</p>
            </div>
            <button onClick={() => n.set(!n.val)} className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${n.val ? 'bg-primary' : 'bg-muted'}`} role="switch" aria-checked={n.val}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${n.val ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
        ))}
      </div>
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
