import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { profileApi, vehicleApi, type VehicleResponse } from '../../../../services/apiService';
import { lookupVehicleData } from '../../../../services/vehicleLookup';
import { useProfile, type DriverType } from '../../../context/ProfileContext';
import {
  StepVehicle, StepDriverType, StepPreferences, StepFinished,
} from './OnboardingSteps';
import { StepPaymentStripe } from './StepPaymentStripe';

const PT_PLATE_REGEX = /^[A-Z0-9]{2}-[A-Z0-9]{2}-[A-Z0-9]{2}$/;

const STEPS = ['Associar veículo', 'Método de pagamento', 'Tipo de condutor', 'Preferências', 'Concluído'];

export function OnboardingModal({
  needsVehicle,
  needsPayment,
  onFinish,
  onClose,
}: {
  needsVehicle: boolean;
  needsPayment: boolean;
  onFinish: (dt: DriverType) => void;
  onClose: () => void;
}) {
  const { addVehicle, setDriverType: setProfileDriverType } = useProfile();
  const initialStep = needsVehicle ? 1 : needsPayment ? 2 : 3;
  const [step, setStep] = useState(initialStep);

  const [plate, setPlate]   = useState('');
  const [rfid, setRfid]     = useState('');
  const [plateLoading, setPlateLoading] = useState(false);
  const [plateError, setPlateError]     = useState<string | null>(null);
  const [vehicleResult, setVehicleResult] = useState<VehicleResponse | null>(null);
  const [manualData, setManualData] = useState<{ make?: string; model?: string; fuelType?: string; year?: string }>({});
  const [showManualForm, setShowManualForm] = useState(false);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [driverType, setDriverType]             = useState<DriverType>('regular');
  const [notifPush, setNotifPush]               = useState(true);
  const [notifEmail, setNotifEmail]             = useState(false);
  const [savingProfile, setSavingProfile]       = useState(false);

  useEffect(() => {
    setStep(needsVehicle ? 1 : needsPayment ? 2 : 3);
  }, [needsVehicle, needsPayment]);

  useEffect(() => {
    profileApi.get()
      .then((profile) => {
        setDriverType(profile.driverType ?? 'regular');
        setNotifPush(profile.pushNotificationsEnabled ?? profile.notificationsEnabled);
        setNotifEmail(profile.emailNotificationsEnabled ?? false);
      })
      .catch((error: unknown) => {
        console.error('[Onboarding] Failed to load driver profile:', error);
      });
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!PT_PLATE_REGEX.test(plate)) {
      setVehicleResult(null); setPlateError(null);
      setShowManualForm(false); setManualData({});
      return;
    }
    setPlateLoading(true);
    setVehicleResult(null); setPlateError(null); setShowManualForm(false);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await lookupVehicleData(plate);
        setManualData({
          make: data.make,
          model: data.model,
          fuelType: data.fuelType,
          year: data.plateDate ? data.plateDate.slice(0, 4) : undefined,
        });
        setVehicleResult({
          id: '',
          plate,
          make: data.make ?? null,
          model: data.model ?? null,
          version: data.version ?? null,
          color: data.color ?? null,
          year: data.plateDate ? parseInt(data.plateDate.slice(0, 4), 10) : 0,
          fuelType: data.fuelType ?? null,
          powerKW: null,
          nickname: null,
          isEv: false,
          isAccessible: false,
          isPrimary: false,
        });
        toast.success('Veículo identificado automaticamente!', {
          description: [data.make, data.model].filter(Boolean).join(' ') || plate,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao registar veículo.';
        if (msg.includes('already exists')) {
          setPlateError('Esta matrícula já está registada na sua conta.');
        } else {
          setPlateError('Não foi possível identificar a matrícula automaticamente.');
          setShowManualForm(true);
        }
      } finally {
        setPlateLoading(false);
      }
    }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [plate]);

  const handleSaveManual = async () => {
    if (!manualData.make || !manualData.model || !manualData.fuelType || !manualData.year) {
      toast.warning('Preencha todos os campos: Marca, Modelo, Ano e Combustível.');
      return;
    }
    setSavingVehicle(true);
    try {
      const created = await vehicleApi.create({
        licensePlate: plate,
        externalIdentifier: rfid || undefined,
        make: manualData.make,
        model: manualData.model,
        fuelType: manualData.fuelType,
        year: parseInt(manualData.year, 10),
      });
      setVehicleResult(created);
      addVehicle({
        id: created.id,
        plate: created.plate,
        make: created.make ?? undefined,
        model: created.model ?? undefined,
        version: created.version ?? undefined,
        color: created.color ?? undefined,
        year: created.year ? String(created.year) : undefined,
        fuelType: created.fuelType ?? undefined,
        isEV: created.isEv,
        isAccessible: created.isAccessible,
        isPrimary: created.isPrimary,
      });
      setShowManualForm(false);
      toast.success('Veículo registado manualmente!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registar veículo.');
    } finally {
      setSavingVehicle(false);
    }
  };

  const canAdvanceVehicleStep = vehicleResult !== null;

  const handleNext = async () => {
    if (step === 1) {
      if (!canAdvanceVehicleStep) {
        toast.warning('Associa um veículo para continuar.');
        return;
      }
      if (!vehicleResult?.id) {
        setSavingVehicle(true);
        try {
          const created = await vehicleApi.create({
            licensePlate: plate,
            externalIdentifier: rfid || undefined,
            make: manualData.make,
            model: manualData.model,
            fuelType: manualData.fuelType,
            year: manualData.year ? parseInt(manualData.year, 10) : undefined,
          });
          setVehicleResult(created);
          addVehicle({
            id: created.id,
            plate: created.plate,
            make: created.make ?? undefined,
            model: created.model ?? undefined,
            version: created.version ?? undefined,
            color: created.color ?? undefined,
            year: created.year ? String(created.year) : undefined,
            fuelType: created.fuelType ?? undefined,
            isEV: created.isEv,
            isAccessible: created.isAccessible,
            isPrimary: created.isPrimary,
          });
          toast.success('Veículo associado com sucesso.');
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Erro ao associar veículo.');
          setSavingVehicle(false);
          return;
        }
        setSavingVehicle(false);
      }
    }
    if (step === 4) {
      setSavingProfile(true);
      try {
        const updatedProfile = await profileApi.update({
          driverType,
          notificationsEnabled: notifPush || notifEmail,
          pushNotificationsEnabled: notifPush,
          emailNotificationsEnabled: notifEmail,
        });
        setProfileDriverType(updatedProfile.driverType ?? 'regular');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao guardar preferências.');
        setSavingProfile(false);
        return;
      }
      setSavingProfile(false);
    }
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (!needsVehicle && step === 2) {
      return;
    }
    setStep((s) => s - 1);
  };

  const isFinishStep = step === STEPS.length;
  const progressPct  = Math.round((step / STEPS.length) * 100);

  const renderStep = () => {
    if (step === 1) return (
      <StepVehicle
        plate={plate} setPlate={setPlate}
        rfid={rfid} setRfid={setRfid}
        plateLoading={plateLoading}
        vehicleData={vehicleResult ? {
          make: vehicleResult.make ?? undefined,
          model: vehicleResult.model ?? undefined,
          color: vehicleResult.color ?? undefined,
          fuelType: vehicleResult.fuelType ?? undefined,
          plateDate: vehicleResult.year ? String(vehicleResult.year) : undefined,
        } : null}
        insuranceData={null}
        plateError={plateError}
        manualVehicleData={manualData}
        setManualVehicleData={setManualData as React.Dispatch<React.SetStateAction<Record<string, unknown>>>}
        showManualVehicleForm={showManualForm}
        setShowManualVehicleForm={setShowManualForm}
        onSaveManual={handleSaveManual}
        savingManual={savingVehicle}
      />
    );
    if (step === 2) return <StepPaymentStripe onReady={setPaymentConfirmed} />;
    if (step === 3) return <StepDriverType driverType={driverType} setDriverType={setDriverType} />;
    if (step === 4) return <StepPreferences notifPush={notifPush} setNotifPush={setNotifPush} notifEmail={notifEmail} setNotifEmail={setNotifEmail} />;
    if (isFinishStep) return <StepFinished accountType="DRIVER" />;
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
            <span className="text-muted-foreground flex-shrink-0" style={{ fontSize: '0.72rem', fontWeight: 600 }}>{step}/{STEPS.length}</span>
          </div>
          <p className="text-foreground font-bold mt-2" style={{ fontSize: '0.95rem' }}>{STEPS[step - 1]}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">{renderStep()}</div>

        <div className="px-6 pb-5 pt-3 border-t border-border flex gap-3 flex-shrink-0">
          {step > 1 && !isFinishStep && (
            <button onClick={handleBack} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-foreground font-semibold hover:bg-muted transition-colors" style={{ fontSize: '0.85rem' }}>
              <i className="fas fa-arrow-left" />
              Anterior
            </button>
          )}
          {!isFinishStep ? (
            <button
              onClick={handleNext}
              disabled={(step === 2 && !paymentConfirmed) || savingProfile}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-extrabold hover:opacity-90 disabled:opacity-50 shadow-md shadow-primary/20 transition-all"
              style={{ fontSize: '0.9rem' }}
            >
              {savingProfile ? 'A guardar...' : 'Continuar'}
              <i className="fas fa-arrow-right" />
            </button>
          ) : (
            <button onClick={() => onFinish(driverType)} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-extrabold hover:opacity-90 shadow-md shadow-primary/20 transition-all" style={{ fontSize: '0.9rem' }}>
              <i className="fas fa-rocket" />
              Ir para a aplicação
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
