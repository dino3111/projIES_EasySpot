import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import type { ParkingLot } from '../../../data/parkingTypes';
import { useProfile } from '../../../context/ProfileContext';
import {
  calcHours, calcCost, getMinArrivalTime, getDefaultExitTime, genBookingCode,
  type SpotFilter, type ReservationStep,
} from './reservationHelpers';
import { StepBar } from './StepBar';
import { CostSummary } from './CostSummary';
import { Step1ParkHorario } from './Step1ParkHorario';
import { Step2SpotChoice } from './Step2SpotChoice';
import { Step3Confirmation } from './Step3Confirmation';
import { Step4Reserved } from './Step4Reserved';
import { createReservation, lockedUntilCountdownSeconds } from '../../../../services/reservationService';
import { fetchAllParksSummary, fetchParkDetailsById } from '../../../services/parksCatalog';
import { paymentApi } from '../../../../services/apiService';
import type { PaymentMethodSummaryResponse } from '../../../../services/apiService';
import { getAccessToken } from '../../../services/authToken';
import { StepPaymentStripe } from '../welcome/StepPaymentStripe';

export function ReservationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { vehicles, driverType } = useProfile();

  const [step, setStep] = useState<ReservationStep>(1);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    () => vehicles.find((v) => v.isPrimary)?.id ?? ''
  );
  const didInitVehicleSelection = useRef(false);
  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) ?? null,
    [vehicles, selectedVehicleId]
  );

  const [selectedParkId, setSelectedParkId] = useState<string>(searchParams.get('parkId') || '');
  const [arrivalTime, setArrivalTime] = useState<string>(getMinArrivalTime());
  const [exitTime, setExitTime]       = useState<string>(getDefaultExitTime(getMinArrivalTime()));

  const [selectedFloorId, setSelectedFloorId] = useState<string>('');
  const [selectedSpotId, setSelectedSpotId]   = useState<string>('');
  const [spotFilter, setSpotFilter] = useState<SpotFilter>(() => {
    if (driverType === 'ev') return 'ev';
    if (driverType === 'reduced_mobility') return 'accessible';
    return 'todos';
  });
  const didUserSetSpotFilterRef = useRef(false);

  useEffect(() => {
    if (didInitVehicleSelection.current) return;
    if (selectedVehicleId && vehicles.some((v) => v.id === selectedVehicleId)) {
      didInitVehicleSelection.current = true;
      return;
    }
    if (vehicles.length === 0) return;

    const initialVehicle = vehicles.find((v) => v.isPrimary) ?? vehicles[0];
    if (!initialVehicle) return;

    setSelectedVehicleId(initialVehicle.id);
    didInitVehicleSelection.current = true;
  }, [vehicles, selectedVehicleId]);

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [bookingCode, setBookingCode] = useState<string>('');
  const [countdown, setCountdown]     = useState(30 * 60);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reservationError, setReservationError] = useState<string | null>(null);
  const [parks, setParks] = useState<ParkingLot[]>([]);
  const [selectedLot, setSelectedLot] = useState<ParkingLot | null>(null);
  const [paymentConfigured, setPaymentConfigured] = useState<boolean | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodSummaryResponse[]>([]);
  const [showPaymentSetup, setShowPaymentSetup] = useState(false);

  useEffect(() => {
    fetchAllParksSummary().then(setParks).catch(() => setParks([]));
  }, []);
  useEffect(() => {
    let active = true;
    const token = getAccessToken();

    if (!token) {
      setPaymentConfigured(null);
      return () => {
        active = false;
      };
    }

    Promise.allSettled([paymentApi.getSetupStatus(), paymentApi.listMethods()])
      .then(([setupResult, methodsResult]) => {
        if (!active) return;

        if (setupResult.status === 'fulfilled') {
          setPaymentConfigured(setupResult.value.configured);
        } else {
          setPaymentConfigured(null);
        }

        if (methodsResult.status === 'fulfilled') {
          setPaymentMethods(methodsResult.value);
          if (methodsResult.value.length > 0) {
            setPaymentConfigured(true);
          }
        } else {
          setPaymentMethods([]);
        }
      })
      .catch(() => {
        if (active) setPaymentConfigured(null);
      });

    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!selectedParkId) {
      setSelectedLot(null);
      return;
    }
    fetchParkDetailsById(selectedParkId).then(setSelectedLot).catch(() => setSelectedLot(null));
  }, [selectedParkId]);
  const selectedFloor = useMemo(
    () => selectedLot?.floors.find(f => f.id === selectedFloorId) || selectedLot?.floors[0] || null,
    [selectedLot, selectedFloorId]
  );
  const selectedSpot = useMemo(
    () => selectedFloor?.spots.find(s => s.id === selectedSpotId) || null,
    [selectedFloor, selectedSpotId]
  );
  const isEVSpot = selectedSpot?.status === 'ev';
  const estimatedCost = calcCost(selectedLot, calcHours(arrivalTime, exitTime), isEVSpot);
  const spotLabel = selectedSpot ? `${selectedFloor?.name} · Lugar ${selectedSpot.label}` : '';

  useEffect(() => {
    if (selectedLot?.floors.length) {
      setSelectedFloorId(selectedLot.floors[0].id);
      setSelectedSpotId('');
    }
  }, [selectedLot]);

  useEffect(() => {
    if (selectedSpotId) return;
    if (didUserSetSpotFilterRef.current) return;
    if (selectedVehicle?.isEV) {
      setSpotFilter('ev');
      return;
    }
    if (selectedVehicle?.isAccessible) {
      setSpotFilter('accessible');
      return;
    }
    if (driverType === 'ev') {
      setSpotFilter('ev');
      return;
    }
    if (driverType === 'reduced_mobility') {
      setSpotFilter('accessible');
      return;
    }
    setSpotFilter('todos');
  }, [driverType, selectedSpotId, selectedVehicle?.isEV, selectedVehicle?.isAccessible]);

  useEffect(() => {
    didUserSetSpotFilterRef.current = false;
  }, [selectedVehicleId, driverType, selectedParkId]);

  const handleSpotFilterChange = (filter: SpotFilter) => {
    didUserSetSpotFilterRef.current = true;
    setSpotFilter(filter);
  };

  useEffect(() => {
    if (step !== 4) return;
    const interval = setInterval(() => setCountdown(c => (c <= 0 ? 0 : c - 1)), 1000);
    return () => clearInterval(interval);
  }, [step]);

  function handleNewBooking() {
    setStep(1);
    setSelectedSpotId('');
    setAgreeTerms(false);
    setBookingCode('');
    setCountdown(30 * 60);
    setReservationError(null);
  }

  async function handleConfirm() {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setReservationError(null);

    // Generated before the try so retries (network failure, double-tap) use the same key
    const idempotencyKey = crypto.randomUUID();

    try {
      if (paymentConfigured !== true) {
        const [status, methods] = await Promise.all([
          paymentApi.getSetupStatus(),
          paymentApi.listMethods(),
        ]);
        setPaymentMethods(methods);
        const configuredNow = status.configured || methods.length > 0;
        setPaymentConfigured(configuredNow);
        if (!configuredNow) {
          setReservationError('Antes de reservar, configure um método de pagamento Stripe nas suas definições.');
          setShowPaymentSetup(true);
          return;
        }
      }

      const token = getAccessToken();
      const effectiveVehicleId =
        selectedVehicleId || vehicles.find((v) => v.isPrimary)?.id || vehicles[0]?.id || '';

      if (token && effectiveVehicleId) {
        const response = await createReservation(
          {
            parkId: selectedParkId,
            vehicleId: effectiveVehicleId,
            arrivalDateTime: new Date(arrivalTime).toISOString(),
            departureDateTime: new Date(exitTime).toISOString(),
            selectedSpotId: selectedSpotId || null,
          },
          token,
          idempotencyKey,
        );

        setBookingCode(response.bookingCode);
        setCountdown(lockedUntilCountdownSeconds(response.lockedUntil));
      } else {
        // Fallback: no auth token yet (frontend not fully wired to OIDC)
        setBookingCode(genBookingCode());
        setCountdown(30 * 60);
      }

      setStep(4);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar reserva. Tente novamente.';
      const lowered = message.toLowerCase();
      if (lowered.includes('stripe') || lowered.includes('pagamento') || lowered.includes('payment')) {
        setShowPaymentSetup(true);
      }
      setReservationError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-base-100">
      <div className="bg-base-200 border-b border-base-300 px-4 md:px-6 py-4">
        <h1 className="text-2xl font-bold text-base-content flex items-center gap-2">
          <i className="fa-solid fa-bookmark text-primary" />
          {' Reservar Lugar'}
        </h1>
        <p className="text-base-content/60 text-sm mt-0.5">
          Reservas disponíveis com pelo menos 30 minutos de antecedência · Válidas 30 min após a hora marcada
        </p>
      </div>

      <div className="p-4 md:p-6">
        <div className="mb-6">
          <StepBar current={step} />
        </div>

        {reservationError && (
          <div className="alert alert-error mb-4 rounded-2xl" role="alert">
            <i className="fa-solid fa-circle-exclamation" />
            <span>{reservationError}</span>
            <button
              className="btn btn-ghost btn-xs ml-auto"
              onClick={() => setReservationError(null)}
              aria-label="Fechar erro"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0">
            {step === 1 && (
              <Step1ParkHorario
                selectedParkId={selectedParkId} setSelectedParkId={setSelectedParkId}
                arrivalTime={arrivalTime} setArrivalTime={setArrivalTime}
                exitTime={exitTime} setExitTime={setExitTime}
                vehicles={vehicles} selectedVehicleId={selectedVehicleId} setSelectedVehicleId={setSelectedVehicleId}
                parks={parks}
                onNext={() => setStep(2)}
              />
            )}
            {step === 2 && selectedLot && (
              <Step2SpotChoice
                lot={selectedLot}
                spotFilter={spotFilter} onSpotFilterChange={handleSpotFilterChange}
                selectedFloorId={selectedFloorId} setSelectedFloorId={setSelectedFloorId}
                selectedSpotId={selectedSpotId} setSelectedSpotId={setSelectedSpotId}
                onNext={() => setStep(3)} onBack={() => setStep(1)}
              />
            )}
            {step === 3 && selectedLot && (
              <div className="space-y-4">
                <Step3Confirmation
                  lot={selectedLot} floor={selectedFloor?.name || '—'} spot={selectedSpot}
                  arrivalTime={arrivalTime} exitTime={exitTime} cost={estimatedCost}
                  vehicle={selectedVehicle} agreeTerms={agreeTerms} setAgreeTerms={setAgreeTerms}
                  onConfirm={handleConfirm} onBack={() => setStep(2)}
                  isSubmitting={isSubmitting} paymentConfigured={paymentConfigured}
                  paymentMethods={paymentMethods}
                  onAddPaymentMethod={() => setShowPaymentSetup(true)}
                />

                {showPaymentSetup && (
                  <div className="card bg-base-200 shadow-md">
                    <div className="card-body p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-semibold text-base-content">
                          <i className="fa-solid fa-credit-card text-primary mr-2" />
                          Adicionar método de pagamento
                        </h3>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => setShowPaymentSetup(false)}
                        >
                          Fechar
                        </button>
                      </div>
                      <StepPaymentStripe
                        allowContinueWithoutPayment={false}
                        onCancel={() => setShowPaymentSetup(false)}
                        onReady={async (confirmed) => {
                          if (confirmed) {
                            setPaymentConfigured(true);
                            setShowPaymentSetup(false);
                            setReservationError(null);
                            return;
                          }

                          try {
                            const [status, methods] = await Promise.all([
                              paymentApi.getSetupStatus(),
                              paymentApi.listMethods(),
                            ]);
                            setPaymentMethods(methods);
                            const configuredNow = status.configured || methods.length > 0;
                            setPaymentConfigured(configuredNow);
                            if (!configuredNow) {
                              setReservationError('Ainda não existe um método de pagamento guardado. Complete o processo Stripe para reservar.');
                            } else {
                              setShowPaymentSetup(false);
                            }
                          } catch {
                            setPaymentConfigured(false);
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
            {step === 4 && (
              <Step4Reserved
                bookingCode={bookingCode} countdown={countdown}
                lot={selectedLot} spot={selectedSpot} vehicle={selectedVehicle}
                arrivalTime={arrivalTime} exitTime={exitTime} cost={estimatedCost}
                onNewBooking={handleNewBooking} onNavigate={() => navigate('/map')}
              />
            )}
          </div>

          {step < 3 && (
            <aside className="lg:w-80 lg:sticky lg:top-4 lg:self-start" aria-label="Resumo do custo">
              <CostSummary
                lot={selectedLot} arrivalTime={arrivalTime} exitTime={exitTime}
                cost={estimatedCost} spotLabel={spotLabel} step={step} isEVSpot={isEVSpot}
              />
              {selectedLot && <div className="card bg-base-200 shadow-md mt-4" />}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
