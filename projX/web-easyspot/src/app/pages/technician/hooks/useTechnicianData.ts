import { useState, useEffect } from 'react';
import {
  fetchSensorList,
  fetchSensorDetail,
  type SensorSummary,
  type SensorDetail,
} from '../../../services/technicianApi';

export type ApiState<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ok'; data: T };

export function useSensorList() {
  const [state, setState] = useState<ApiState<SensorSummary[]>>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    fetchSensorList()
      .then((data) => { if (!cancelled) setState({ status: 'ok', data }); })
      .catch((err: unknown) => {
        if (!cancelled)
          setState({ status: 'error', message: err instanceof Error ? err.message : 'Erro ao carregar sensores.' });
      });
    return () => { cancelled = true; };
  }, []);

  return state;
}

export function useSensorDetail(sensorId: string | null) {
  const [state, setState] = useState<ApiState<SensorDetail> | null>(null);

  useEffect(() => {
    if (!sensorId) { setState(null); return; }
    let cancelled = false;
    setState({ status: 'loading' });
    fetchSensorDetail(sensorId)
      .then((data) => { if (!cancelled) setState({ status: 'ok', data }); })
      .catch((err: unknown) => {
        if (!cancelled)
          setState({ status: 'error', message: err instanceof Error ? err.message : 'Erro ao carregar logs.' });
      });
    return () => { cancelled = true; };
  }, [sensorId]);

  return state;
}
