import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { useProfile, type Vehicle } from '../../../context/ProfileContext';
import { VehicleCard } from './VehicleCard';
import { AddVehicleModal } from './AddVehicleModal';
import { EditVehicleModal } from './EditVehicleModal';
import { DeleteVehicleDialog } from './DeleteVehicleDialog';

export function VeiculosPage() {
  const { vehicles, addVehicle, updateVehicle, removeVehicle, setPrimaryVehicle } = useProfile();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const openEditModal = (vehicle: Vehicle) => { setSelectedVehicle(vehicle); setShowEditModal(true); };
  const closeEditModal = () => { setSelectedVehicle(null); setShowEditModal(false); };
  const openDeleteDialog = (vehicle: Vehicle) => { setSelectedVehicle(vehicle); setShowDeleteDialog(true); };
  const closeDeleteDialog = () => { setSelectedVehicle(null); setShowDeleteDialog(false); };

  const handleDelete = () => {
    if (!selectedVehicle) return;
    removeVehicle(selectedVehicle.id);
    toast.success('Veículo removido com sucesso');
    closeDeleteDialog();
  };

  const handleSetPrimary = (id: string) => {
    setPrimaryVehicle(id);
    toast.success('Veículo principal alterado');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 pb-24">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/perfil" className="w-8 h-8 rounded-xl bg-muted hover:bg-muted/80 transition-colors flex items-center justify-center">
              <i className="fas fa-arrow-left text-foreground" style={{ fontSize: '0.85rem' }} />
            </Link>
            <h1 className="text-foreground" style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.2 }}>Os Meus Veículos</h1>
          </div>
          <p className="text-muted-foreground ml-10" style={{ fontSize: '0.875rem' }}>Gere os teus veículos e define o principal</p>
        </div>
      </div>

      {vehicles.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-20 h-20 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
            <i className="fas fa-car text-muted-foreground" style={{ fontSize: '2rem' }} />
          </div>
          <p className="text-foreground font-bold mb-1" style={{ fontSize: '1rem' }}>Nenhum veículo registado</p>
          <p className="text-muted-foreground mb-5" style={{ fontSize: '0.85rem' }}>Adiciona o teu primeiro veículo para começar</p>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary rounded-full px-6" style={{ fontSize: '0.875rem' }}>
            <i className="fas fa-plus mr-2" style={{ fontSize: '0.85rem' }} />Adicionar Veículo
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-5">
            {vehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                onEdit={() => openEditModal(vehicle)}
                onDelete={() => openDeleteDialog(vehicle)}
                onSetPrimary={() => handleSetPrimary(vehicle.id)}
              />
            ))}
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full rounded-2xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all py-4 bg-transparent cursor-pointer"
          >
            <i className="fas fa-plus text-primary" style={{ fontSize: '1.1rem' }} />
            <p className="text-primary font-bold mt-2" style={{ fontSize: '0.875rem' }}>Adicionar Novo Veículo</p>
          </button>
        </>
      )}

      {showAddModal && <AddVehicleModal onClose={() => setShowAddModal(false)} onAdd={addVehicle} />}
      {showEditModal && selectedVehicle && (
        <EditVehicleModal
          vehicle={selectedVehicle}
          onClose={closeEditModal}
          onUpdate={(updates) => { updateVehicle(selectedVehicle.id, updates); closeEditModal(); toast.success('Veículo atualizado com sucesso'); }}
        />
      )}
      {showDeleteDialog && selectedVehicle && (
        <DeleteVehicleDialog vehicle={selectedVehicle} onClose={closeDeleteDialog} onConfirm={handleDelete} />
      )}
    </div>
  );
}
