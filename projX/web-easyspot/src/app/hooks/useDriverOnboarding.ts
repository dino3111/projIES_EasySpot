import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { vehicleApi, type VehicleResponse } from '../../services/apiService';
import { useProfile } from '../context/ProfileContext';

export function useDriverOnboarding() {
  const { user } = useAuth();
  const { vehicles, addVehicle } = useProfile();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'DRIVER') {
      setChecked(true);
      return;
    }

    vehicleApi.list()
      .then((serverVehicles) => {
        syncVehiclesToContext(serverVehicles, vehicles, addVehicle);
        if (serverVehicles.length === 0) setShowOnboarding(true);
      })
      .catch(() => {
        if (vehicles.length === 0) setShowOnboarding(true);
      })
      .finally(() => setChecked(true));
  }, [user]);

  return { showOnboarding, setShowOnboarding, checked };
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
