import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { paymentApi, vehicleApi, type VehicleResponse } from '../../services/apiService';
import { useProfile } from '../context/ProfileContext';

export function useDriverOnboarding() {
  const { user } = useAuth();
  const { vehicles, addVehicle } = useProfile();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [needsVehicle, setNeedsVehicle] = useState(false);
  const [needsPayment, setNeedsPayment] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (user?.role !== 'DRIVER') {
      setChecked(true);
      return;
    }

    Promise.allSettled([
      vehicleApi.list(),
      paymentApi.getSetupStatus(),
    ])
      .then(([vehicleResult, paymentResult]) => {
        const hasVehicleData = vehicleResult.status === 'fulfilled';
        const serverVehicles = hasVehicleData ? vehicleResult.value : [];
        const vehicleMissing = hasVehicleData ? serverVehicles.length === 0 : vehicles.length === 0;

        if (hasVehicleData) {
          syncVehiclesToContext(serverVehicles, vehicles, addVehicle);
        }

        const paymentMissing = paymentResult.status === 'fulfilled'
          ? !paymentResult.value.configured
          : true;

        setNeedsVehicle(vehicleMissing);
        setNeedsPayment(paymentMissing);
        setShowOnboarding(vehicleMissing || paymentMissing);
      })
      .finally(() => setChecked(true));
  }, [user]);

  return { showOnboarding, setShowOnboarding, checked, needsVehicle, needsPayment };
}

function syncVehiclesToContext(
  serverVehicles: VehicleResponse[],
  localVehicles: ReturnType<typeof useProfile>['vehicles'],
  addVehicle: ReturnType<typeof useProfile>['addVehicle'],
) {
  const localIds = new Set(localVehicles.map((v) => v.id));
  for (const sv of serverVehicles) {
    if (!localIds.has(sv.id)) {
      addVehicle({
        id: sv.id,
        plate: sv.plate,
        make: sv.make ?? undefined,
        model: sv.model ?? undefined,
        version: sv.version ?? undefined,
        color: sv.color ?? undefined,
        year: sv.year ? String(sv.year) : undefined,
        fuelType: sv.fuelType ?? undefined,
        isEV: sv.isEv,
        isAccessible: sv.isAccessible,
        isPrimary: sv.isPrimary,
      });
    }
  }
}
