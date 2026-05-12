import { useEffect, useMemo, useRef, useState } from 'react';
import type { ParkingLot, ParkingSpot } from '../../../data/parkingTypes';
import { fetchParkDetailsById } from '../../../services/parksCatalog';
import {
  isSpotSelectable,
  spotColorClasses,
  SPOT_FILTER_OPTIONS,
  type SpotFilter,
} from '../reservation/reservationHelpers';
import {
  previewReservationUpdate,
  type ReservationResponse,
  type ReservationUpdatePreviewResponse,
} from '../../../../services/reservationService';
import { getAccessToken } from '../../../services/authToken';
import { fromLocalDateTimeInput, toLocalDateTimeInput } from './reservationsHelpers';

export interface EditReservationFormValues {
  arrivalDateTime: string;
  departureDateTime: string;
  selectedSpotId: string | null;
}

interface EditReservationModalProps {
  reservation: ReservationResponse;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (values: EditReservationFormValues) => void;
}

const MIN_LEAD_MS = 30 * 60 * 1000;

export function EditReservationModal({
  reservation, isSubmitting, error, onClose, onSave,
}: Readonly<EditReservationModalProps>) {
  const [arrival, setArrival] = useState(() => toLocalDateTimeInput(reservation.arrivalDateTime));
  const [departure, setDeparture] = useState(() => toLocalDateTimeInput(reservation.departureDateTime));

  const [lot, setLot] = useState<ParkingLot | null>(null);
  const [loadingLot, setLoadingLot] = useState(true);
  const [lotError, setLotError] = useState<string | null>(null);

  const [floorId, setFloorId] = useState<string>('');
  const [spotId, setSpotId] = useState<string>(reservation.spotId ?? '');
  const [spotFilter, setSpotFilter] = useState<SpotFilter>('todos');

  const [preview, setPreview] = useState<ReservationUpdatePreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewSeq = useRef(0);

  useEffect(() => {
    let active = true;
    setLoadingLot(true);
    setLotError(null);
    fetchParkDetailsById(reservation.parkId)
      .then((result) => {
        if (!active) return;
        if (!result) {
          setLotError('Parque indisponível para alteração de lugar.');
          setLot(null);
          return;
        }
        setLot(result);
        const initialFloor = result.floors.find((f) => f.spots.some((s) => s.id === reservation.spotId))
          ?? result.floors[0];
        if (initialFloor) setFloorId(initialFloor.id);
      })
      .catch(() => {
        if (active) {
          setLotError('Não foi possível carregar o mapa de lugares.');
          setLot(null);
        }
      })
      .finally(() => {
        if (active) setLoadingLot(false);
      });
    return () => { active = false; };
  }, [reservation.parkId, reservation.spotId]);

  const floor = useMemo(() => lot?.floors.find((f) => f.id === floorId) ?? lot?.floors[0] ?? null, [lot, floorId]);
  const spotsByRow = useMemo(() => {
    if (!floor) return {} as Record<number, ParkingSpot[]>;
    return floor.spots.reduce((acc, spot) => {
      (acc[spot.row] = acc[spot.row] ?? []).push(spot);
      return acc;
    }, {} as Record<number, ParkingSpot[]>);
  }, [floor]);

  useEffect(() => {
    if (!arrival || !departure) {
      previewSeq.current += 1;
      setPreview(null);
      setPreviewError(null);
      setPreviewLoading(false);
      return;
    }
    const start = new Date(arrival).getTime();
    const end = new Date(departure).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start || start < Date.now() + MIN_LEAD_MS) {
      previewSeq.current += 1;
      setPreview(null);
      setPreviewError(null);
      setPreviewLoading(false);
      return;
    }
    const token = getAccessToken();
    if (!token) {
      previewSeq.current += 1;
      setPreview(null);
      setPreviewError(null);
      setPreviewLoading(false);
      return;
    }

    const seq = ++previewSeq.current;
    setPreviewLoading(true);
    setPreviewError(null);

    const handle = window.setTimeout(() => {
      previewReservationUpdate(
        reservation.reservationId,
        {
          parkId: reservation.parkId,
          vehicleId: reservation.vehicleId ?? '',
          arrivalDateTime: fromLocalDateTimeInput(arrival),
          departureDateTime: fromLocalDateTimeInput(departure),
          selectedSpotId: spotId || null,
        },
        token,
      )
        .then((result) => {
          if (seq !== previewSeq.current) return;
          setPreview(result);
        })
        .catch((err: unknown) => {
          if (seq !== previewSeq.current) return;
          setPreview(null);
          setPreviewError(err instanceof Error ? err.message : 'Falha ao calcular novo custo.');
        })
        .finally(() => {
          if (seq === previewSeq.current) setPreviewLoading(false);
        });
    }, 350);

    return () => {
      window.clearTimeout(handle);
      if (seq === previewSeq.current) {
        setPreviewLoading(false);
      }
    };
  }, [arrival, departure, spotId, reservation.reservationId, reservation.parkId, reservation.vehicleId]);

  const validation = useMemo(() => {
    if (!arrival || !departure) return 'Preencha as duas datas.';
    const start = new Date(arrival).getTime();
    const end = new Date(departure).getTime();
    if (Number.isNaN(start) || Number.isNaN(end)) return 'Data inválida.';
    if (end <= start) return 'A saída tem de ser depois da entrada.';
    if (start < Date.now() + MIN_LEAD_MS) return 'A reserva requer pelo menos 30 minutos de antecedência.';
    return null;
  }, [arrival, departure]);

  const disabled = isSubmitting || validation !== null;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (validation) return;
    onSave({
      arrivalDateTime: fromLocalDateTimeInput(arrival),
      departureDateTime: fromLocalDateTimeInput(departure),
      selectedSpotId: spotId || null,
    });
  };

  const handleSpotClick = (spot: ParkingSpot) => {
    if (!isSpotSelectable(spot, spotFilter) && spot.id !== reservation.spotId) return;
    setSpotId((current) => (current === spot.id ? '' : spot.id));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4 pb-[calc(env(safe-area-inset-bottom,0px)+5rem)] md:pb-4 overflow-y-auto">
      <form
        onSubmit={handleSubmit}
        className="bg-background rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[calc(100dvh-6rem)] md:max-h-[92vh] my-auto"
      >
        <div className="border-b border-border px-5 py-4 flex items-center justify-between rounded-t-3xl bg-background flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-foreground font-extrabold truncate" style={{ fontSize: '1.15rem' }}>
              Editar reserva
            </h2>
            <p className="text-muted-foreground truncate" style={{ fontSize: '0.78rem' }}>
              {reservation.parkName} · <span className="font-mono">{reservation.bookingCode}</span>
            </p>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-muted transition-colors flex items-center justify-center"
          >
            <i className="fas fa-times text-muted-foreground" style={{ fontSize: '0.9rem' }} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5 flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-arrival" className="block text-muted-foreground font-bold mb-1.5" style={{ fontSize: '0.82rem' }}>
                <i className="fas fa-right-to-bracket mr-1.5 text-primary" />
                Entrada
              </label>
              <input
                id="edit-arrival"
                type="datetime-local"
                value={arrival}
                onChange={(e) => setArrival(e.target.value)}
                className="input input-bordered w-full rounded-xl"
                style={{ fontSize: '0.88rem' }}
                required
              />
            </div>
            <div>
              <label htmlFor="edit-departure" className="block text-muted-foreground font-bold mb-1.5" style={{ fontSize: '0.82rem' }}>
                <i className="fas fa-right-from-bracket mr-1.5 text-primary" />
                Saída
              </label>
              <input
                id="edit-departure"
                type="datetime-local"
                value={departure}
                onChange={(e) => setDeparture(e.target.value)}
                className="input input-bordered w-full rounded-xl"
                style={{ fontSize: '0.88rem' }}
                required
              />
            </div>
          </div>

          <section aria-label="Escolha de lugar">
            <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
              <h3 className="text-foreground font-bold" style={{ fontSize: '0.9rem' }}>
                <i className="fas fa-square-parking text-primary mr-1.5" />
                Lugar
              </h3>
              <button
                type="button"
                onClick={() => setSpotId('')}
                className={`btn btn-xs rounded-full ${spotId === '' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.72rem' }}
              >
                <i className="fas fa-wand-magic-sparkles mr-1" />
                Atribuição automática
              </button>
            </div>

            {loadingLot && (
              <div className="text-center py-6">
                <span className="loading loading-spinner loading-sm text-primary" />
                <p className="text-muted-foreground mt-2" style={{ fontSize: '0.78rem' }}>A carregar mapa…</p>
              </div>
            )}

            {!loadingLot && lotError && (
              <p className="text-warning" style={{ fontSize: '0.78rem' }}>
                <i className="fas fa-triangle-exclamation mr-1.5" />{lotError}
              </p>
            )}

            {!loadingLot && lot && floor && (
              <div className="space-y-3">
                {lot.floors.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto" role="tablist" aria-label="Pisos">
                    {lot.floors.map((f) => {
                      const active = f.id === floor.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setFloorId(f.id)}
                          className={`px-3 py-1.5 rounded-full border flex-shrink-0 transition-all ${
                            active
                              ? 'bg-primary/15 text-primary border-primary/40 font-bold'
                              : 'bg-card text-muted-foreground border-border hover:border-primary/40'
                          }`}
                          style={{ fontSize: '0.75rem' }}
                        >
                          {f.name}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center gap-2 overflow-x-auto" role="group" aria-label="Filtro de lugar">
                  {SPOT_FILTER_OPTIONS.map((opt) => {
                    const active = spotFilter === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setSpotFilter(opt.key)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full border flex-shrink-0 transition-all ${
                          active
                            ? 'bg-primary/15 text-primary border-primary/40 font-bold'
                            : 'bg-card text-muted-foreground border-border hover:border-primary/40'
                        }`}
                        style={{ fontSize: '0.72rem' }}
                      >
                        <i className={opt.icon} style={{ fontSize: '0.65rem' }} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                <div className="bg-muted/30 rounded-xl p-3 overflow-x-auto">
                  <div className="space-y-1.5 min-w-fit">
                    {Object.keys(spotsByRow)
                      .map(Number)
                      .sort((a, b) => a - b)
                      .map((rowIdx) => (
                        <div key={rowIdx} className="flex items-center gap-1.5 justify-center">
                          {spotsByRow[rowIdx]
                            .slice()
                            .sort((a, b) => a.col - b.col)
                            .map((spot) => {
                              const isSelected = spotId === spot.id;
                              const selectable = isSpotSelectable(spot, spotFilter) || spot.id === reservation.spotId;
                              return (
                                <button
                                  key={spot.id}
                                  type="button"
                                  onClick={() => handleSpotClick(spot)}
                                  disabled={!selectable && !isSelected}
                                  aria-label={`Lugar ${spot.label ?? spot.id}`}
                                  aria-pressed={isSelected}
                                  className={`w-7 h-7 rounded-md border text-[10px] font-bold flex items-center justify-center transition-all ${spotColorClasses(spot, isSelected, selectable)}`}
                                >
                                  {isSelected ? (
                                    <i className="fa-solid fa-check text-[8px]" />
                                  ) : spot.status === 'ev' ? (
                                    <i className="fa-solid fa-bolt text-[8px]" />
                                  ) : spot.status === 'accessible' ? (
                                    <i className="fa-solid fa-wheelchair text-[8px]" />
                                  ) : (
                                    spot.label
                                  )}
                                </button>
                              );
                            })}
                        </div>
                      ))}
                  </div>
                </div>

                <p className="text-muted-foreground" style={{ fontSize: '0.72rem' }}>
                  <i className="fas fa-circle-info mr-1" />
                  Sem seleção = o sistema atribui o primeiro lugar disponível.
                </p>
              </div>
            )}
          </section>

          <section aria-label="Resumo de pagamento" className="rounded-2xl border border-border bg-card p-4">
            <h3 className="text-foreground font-bold mb-2 flex items-center gap-2" style={{ fontSize: '0.9rem' }}>
              <i className="fas fa-credit-card text-primary" />
              Pagamento
            </h3>
            {previewLoading && (
              <p className="text-muted-foreground" style={{ fontSize: '0.78rem' }}>
                <span className="loading loading-spinner loading-xs mr-1" />
                A calcular novo valor…
              </p>
            )}
            {!previewLoading && previewError && (
              <p className="text-warning" style={{ fontSize: '0.78rem' }}>
                <i className="fas fa-triangle-exclamation mr-1.5" />{previewError}
              </p>
            )}
            {!previewLoading && !previewError && preview && (
              <div className="space-y-1.5" style={{ fontSize: '0.82rem' }}>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Valor atual</span>
                  <span className="font-mono">{Number(preview.previousCost).toFixed(2)} €</span>
                </div>
                <div className="flex items-center justify-between text-foreground">
                  <span className="font-semibold">Novo valor</span>
                  <span className="font-mono font-bold">{Number(preview.newCost).toFixed(2)} €</span>
                </div>
                <div className="border-t border-border pt-1.5 flex items-center justify-between">
                  {preview.costDelta === 0 && (
                    <>
                      <span className="text-muted-foreground">Sem alteração de valor</span>
                      <span className="font-mono">0.00 €</span>
                    </>
                  )}
                  {preview.costDelta > 0 && (
                    <>
                      <span className="text-warning font-semibold">
                        <i className="fas fa-arrow-up mr-1" />
                        Vai ser cobrada a diferença via Stripe
                      </span>
                      <span className="font-mono font-bold text-warning">
                        +{Number(preview.costDelta).toFixed(2)} €
                      </span>
                    </>
                  )}
                  {preview.costDelta < 0 && (
                    <>
                      <span className="text-success font-semibold">
                        <i className="fas fa-arrow-down mr-1" />
                        Vai ser reembolsada a diferença via Stripe
                      </span>
                      <span className="font-mono font-bold text-success">
                        {Number(preview.costDelta).toFixed(2)} €
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
            {!previewLoading && !previewError && !preview && (
              <p className="text-muted-foreground" style={{ fontSize: '0.78rem' }}>
                Ajuste as datas para ver o novo valor.
              </p>
            )}
          </section>

          {validation && !error && (
            <p className="text-warning" style={{ fontSize: '0.78rem' }}>
              <i className="fas fa-triangle-exclamation mr-1.5" />
              {validation}
            </p>
          )}
          {error && (
            <div className="alert alert-error rounded-2xl" role="alert">
              <i className="fa-solid fa-circle-exclamation" />
              <span style={{ fontSize: '0.82rem' }}>{error}</span>
            </div>
          )}
        </div>

        <div className="border-t border-border px-5 py-4 flex items-center gap-3 bg-background flex-shrink-0 rounded-b-3xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="btn btn-ghost flex-1 rounded-full"
            style={{ fontSize: '0.875rem' }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={disabled}
            className="btn btn-primary flex-1 rounded-full"
            style={{ fontSize: '0.875rem' }}
          >
            {isSubmitting ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <>
                <i className="fas fa-floppy-disk mr-2" style={{ fontSize: '0.8rem' }} />
                {preview && preview.costDelta > 0
                  ? `Pagar +${Number(preview.costDelta).toFixed(2)} € e guardar`
                  : preview && preview.costDelta < 0
                    ? `Reembolsar ${Math.abs(preview.costDelta).toFixed(2)} € e guardar`
                    : 'Guardar'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
