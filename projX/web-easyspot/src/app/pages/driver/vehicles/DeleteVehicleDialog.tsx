import type { Vehicle } from '../../../context/ProfileContext';

export function DeleteVehicleDialog({
  vehicle, onClose, onConfirm,
}: Readonly<{ vehicle: Vehicle; onClose: () => void; onConfirm: () => void }>) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background rounded-3xl w-full max-w-sm shadow-2xl">
        <div className="px-5 pt-5 pb-3 text-center">
          <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-3">
            <i className="fas fa-exclamation-triangle text-error" style={{ fontSize: '1.5rem' }} />
          </div>
          <h2 className="text-foreground font-extrabold mb-2" style={{ fontSize: '1.2rem' }}>Remover Veículo?</h2>
          <p className="text-muted-foreground" style={{ fontSize: '0.875rem' }}>
            Tens a certeza que desejas remover o veículo <strong className="text-foreground">{vehicle.plate}</strong>?
            Esta ação não pode ser revertida.
          </p>
        </div>
        <div className="border-t border-border px-5 py-4 flex items-center gap-3">
          <button onClick={onClose} className="btn btn-ghost flex-1 rounded-full" style={{ fontSize: '0.875rem' }}>Cancelar</button>
          <button onClick={onConfirm} className="btn bg-error hover:bg-error/90 text-white border-none flex-1 rounded-full" style={{ fontSize: '0.875rem' }}>
            <i className="fas fa-trash mr-2" style={{ fontSize: '0.8rem' }} />Remover
          </button>
        </div>
      </div>
    </div>
  );
}
