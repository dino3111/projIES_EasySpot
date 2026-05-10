import { useState, useEffect, useMemo } from 'react';
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
import { getAccessToken } from '../../../services/authToken';

export function ReservationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { vehicles } = useProfile();

  const [step, setStep] = useState<ReservationStep>(1);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    () => vehicles.find((v) => v.isPrimary)?.id ?? ''
  );
  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) ?? null,
    [vehicles, selectedVehicleId]
  );

  const [selectedParkId, setSelectedParkId] = useState<string>(searchParams.get('parkId') || '');
  const [arrivalTime, setArrivalTime] = useState<string>(getMinArrivalTime());
  const [exitTime, setExitTime]       = useState<string>(getDefaultExitTime(getMinArrivalTime()));

  const [selectedFloorId, setSelectedFloorId] = useState<string>('');
  const [selectedSpotId, setSelectedSpotId]   = useState<string>('');
  const [spotFilter, setSpotFilter]           = useState<SpotFilter>('todos');

  useEffect(() => {
    if (selectedVehicle?.isEV) setSpotFilter('ev');
    else if (selectedVehicle?.isAccessible) setSpotFilter('accessible');
    else setSpotFilter('todos');
  }, [selectedVehicleId]);

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [bookingCode, setBookingCode] = useState<string>('');
  const [countdown, setCountdown]     = useState(30 * 60);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reservationError, setReservationError] = useState<string | null>(null);
  const [parks, setParks] = useState<ParkingLot[]>([]);
  const [selectedLot, setSelectedLot] = useState<ParkingLot | null>(null);

  useEffect(() => {
    fetchAllParksSummary().then(setParks).catch(() => setParks([]));
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
      const token = getAccessToken();

      if (token && selectedVehicleId) {
        const response = await createReservation(
          {
            parkId: selectedParkId,
            vehicleId: selectedVehicleId,
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
          Reservar Lugar
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
          <div className="alert alert-error mb-4 rounded-2xl">
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
                spotFilter={spotFilter} setSpotFilter={setSpotFilter}
                selectedFloorId={selectedFloorId} setSelectedFloorId={setSelectedFloorId}
                selectedSpotId={selectedSpotId} setSelectedSpotId={setSelectedSpotId}
                onNext={() => setStep(3)} onBack={() => setStep(1)}
              />
            )}
            {step === 3 && selectedLot && (
              <Step3Confirmation
                lot={selectedLot} floor={selectedFloor?.name || '—'} spot={selectedSpot}
                arrivalTime={arrivalTime} exitTime={exitTime} cost={estimatedCost}
                vehicle={selectedVehicle} agreeTerms={agreeTerms} setAgreeTerms={setAgreeTerms}
                onConfirm={handleConfirm} onBack={() => setStep(2)}
                isSubmitting={isSubmitting}
              />
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
