import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { lookupVehicleData, lookupInsuranceData, type VehicleData, type InsuranceData } from '../../../../services/vehicleLookup';
import type { AccountType, DriverType } from '../../../context/ProfileContext';
import {
  StepAccountType, StepVehicle, StepAccess, StepPayment,
  StepDriverType, StepPreferences, StepFinished,
} from './OnboardingSteps';

const PT_PLATE_REGEX = /^[A-Z0-9]{2}-[A-Z0-9]{2}-[A-Z0-9]{2}$/;

export function OnboardingModal({
  step, accountType, onSetAccountType, onNext, onBack, onFinish, onClose,
}: {
  step: number;
  accountType: AccountType;
  onSetAccountType: (t: AccountType) => void;
  onNext: () => void;
  onBack: () => void;
  onFinish: (dt: DriverType, at: AccountType) => void;
  onClose: () => void;
}) {
  const [plate, setPlate]                 = useState('');
  const [rfid, setRfid]                   = useState('');
  const [plateLoading, setPlateLoading]   = useState(false);
  const [vehicleData, setVehicleData]     = useState<VehicleData | null>(null);
  const [insuranceData, setInsuranceData] = useState<InsuranceData | null>(null);
  const [plateError, setPlateError]       = useState<string | null>(null);
  const [manualVehicleData, setManualVehicleData] = useState<Partial<VehicleData>>({});
  const [showManualVehicleForm, setShowManualVehicleForm] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [payMethod, setPayMethod]   = useState<'card' | 'mbway' | 'mb'>('card');
  const [cardN, setCardN]           = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv]       = useState('');
  const [phone, setPhone]           = useState('');
  const [driverType, setDriverType] = useState<DriverType>('regular');
  const [notifPush, setNotifPush]   = useState(true);
  const [notifEmail, setNotifEmail] = useState(false);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!PT_PLATE_REGEX.test(plate)) {
      setVehicleData(null); setInsuranceData(null); setPlateError(null);
      setShowManualVehicleForm(false); setManualVehicleData({});
      return;
    }
    setPlateLoading(true); setVehicleData(null); setInsuranceData(null);
    setPlateError(null); setShowManualVehicleForm(false);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await lookupVehicleData(plate);
        if (!data?.make && !data?.model) {
          const msg = 'Não foram encontrados dados para esta matrícula.';
          setPlateError(msg);
          toast.warning(msg, { description: `Matrícula: ${plate}` });
          return;
        }
        setVehicleData(data);
        toast.success('Veículo identificado com sucesso!', { description: [data.make, data.model].filter(Boolean).join(' ') || plate });
        const insurance = await lookupInsuranceData(plate);
        setInsuranceData(insurance);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro inesperado ao consultar a matrícula.';
        setPlateError(msg);
        setShowManualVehicleForm(true);
        toast.error(msg, { description: `Matrícula: ${plate}` });
      } finally {
        setPlateLoading(false);
      }
    }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [plate]);

  const maxStep = accountType === 'DRIVER' ? 6 : 3;
  const progressPct = Math.round((step / maxStep) * 100);
  const isFinishStep = (accountType === 'DRIVER' && step === 6) || (accountType !== 'DRIVER' && step === 3);

  const stepTitles: Record<number, string> = {
    1: 'Tipo de conta',
    2: accountType === 'DRIVER' ? 'Associar veículo' : 'Configurar acesso',
    3: accountType === 'DRIVER' ? 'Método de pagamento' : 'Concluído',
    4: 'Tipo de condutor',
    5: 'Preferências',
    6: 'Concluído',
  };

  const renderStep = () => {
    if (step === 1) return <StepAccountType accountType={accountType} onSet={onSetAccountType} />;
    if (step === 2 && accountType === 'DRIVER') return (
      <StepVehicle plate={plate} setPlate={setPlate} rfid={rfid} setRfid={setRfid}
        plateLoading={plateLoading} vehicleData={vehicleData} insuranceData={insuranceData}
        plateError={plateError} manualVehicleData={manualVehicleData} setManualVehicleData={setManualVehicleData}
        showManualVehicleForm={showManualVehicleForm} setShowManualVehicleForm={setShowManualVehicleForm}
      />
    );
    if (step === 2) return <StepAccess accountType={accountType} />;
    if (step === 3 && accountType === 'DRIVER') return (
      <StepPayment payMethod={payMethod} setPayMethod={setPayMethod} cardN={cardN} setCardN={setCardN}
        cardExpiry={cardExpiry} setCardExpiry={setCardExpiry} cardCvv={cardCvv} setCardCvv={setCardCvv}
        phone={phone} setPhone={setPhone}
      />
    );
    if (step === 4 && accountType === 'DRIVER') return <StepDriverType driverType={driverType} setDriverType={setDriverType} />;
    if (step === 5 && accountType === 'DRIVER') return <StepPreferences notifPush={notifPush} setNotifPush={setNotifPush} notifEmail={notifEmail} setNotifEmail={setNotifEmail} />;
    if (isFinishStep) return <StepFinished accountType={accountType} />;
    return null;
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-card border border-border rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
        <div className="px-6 pt-5 pb-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <i className="fas fa-square-parking text-primary-foreground" style={{ fontSize: '0.75rem' }} />
              </div>
              <span className="text-foreground font-extrabold" style={{ fontSize: '0.95rem' }}>Configuração inicial</span>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center transition-colors">
              <i className="fas fa-times text-muted-foreground" style={{ fontSize: '0.8rem' }} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="text-muted-foreground flex-shrink-0" style={{ fontSize: '0.72rem', fontWeight: 600 }}>{step}/{maxStep}</span>
          </div>
          <p className="text-foreground font-bold mt-2" style={{ fontSize: '0.95rem' }}>{stepTitles[step]}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">{renderStep()}</div>

        <div className="px-6 pb-5 pt-3 border-t border-border flex gap-3 flex-shrink-0">
          {step > 1 && !isFinishStep && (
            <button onClick={onBack} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-foreground font-semibold hover:bg-muted transition-colors" style={{ fontSize: '0.85rem' }}>
              <i className="fas fa-arrow-left" />
              Anterior
            </button>
          )}
          {!isFinishStep ? (
            <button onClick={onNext} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-extrabold hover:opacity-90 shadow-md shadow-primary/20 transition-all" style={{ fontSize: '0.9rem' }}>
              Continuar
              <i className="fas fa-arrow-right" />
            </button>
          ) : (
            <button onClick={() => onFinish(driverType, accountType)} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-extrabold hover:opacity-90 shadow-md shadow-primary/20 transition-all" style={{ fontSize: '0.9rem' }}>
              <i className="fas fa-rocket" />
              Ir para a aplicação
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
