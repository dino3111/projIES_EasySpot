import { request } from './apiService';

export interface VehicleData {
  plate?: string;
  vin?: string;
  make?: string;
  model?: string;
  version?: string;
  plateDate?: string;
  color?: string;
  fuelType?: string;
  categoryType?: string;
  powerkw?: string;
}

export interface InsuranceData {
  entity?: string;
  policy?: string;
  endDate?: string;
}

export async function lookupVehicleData(plate: string): Promise<VehicleData> {
  return request<VehicleData>(`/api/vehicles/lookup?plate=${encodeURIComponent(plate)}`);
}

export async function lookupInsuranceData(plate: string): Promise<InsuranceData | null> {
  try {
    return await request<InsuranceData>(`/api/vehicles/insurance?plate=${encodeURIComponent(plate)}`);
  } catch {
    return null;
  }
}
