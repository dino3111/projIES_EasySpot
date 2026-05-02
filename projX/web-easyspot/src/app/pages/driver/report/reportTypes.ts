export type ReportStep = 1 | 2;
export type ViolationType = 'accessible' | 'reserved' | 'ev' | 'double-parked' | 'blocking' | 'other';

export interface ReportForm {
  parkingLotId: string;
  zone: string;
  spotNumber: string;
  violationType: ViolationType;
  vehiclePlate: string;
  description: string;
}

export const violationTypes: { id: ViolationType; label: string; icon: string; description: string; color: string }[] = [
  {
    id: 'accessible',
    label: 'Lugar de Mobilidade Reduzida',
    icon: 'fa-wheelchair',
    description: 'Veículo sem dístico a ocupar lugar para pessoas com mobilidade reduzida',
    color: 'text-blue-500',
  },
  {
    id: 'reserved',
    label: 'Lugar Reservado',
    icon: 'fa-bookmark',
    description: 'Veículo sem autorização em lugar reservado',
    color: 'text-violet-500',
  },
  {
    id: 'ev',
    label: 'Lugar de Carregamento EV',
    icon: 'fa-charging-station',
    description: 'Veículo não elétrico a ocupar lugar de carregamento',
    color: 'text-green-500',
  },
  {
    id: 'double-parked',
    label: 'Estacionamento em Dupla Fila',
    icon: 'fa-car-side',
    description: 'Veículo estacionado em fila dupla a bloquear outros',
    color: 'text-orange-500',
  },
  {
    id: 'blocking',
    label: 'A Bloquear Acesso',
    icon: 'fa-ban',
    description: 'Veículo a bloquear entrada, saída ou circulação',
    color: 'text-red-500',
  },
  {
    id: 'other',
    label: 'Outra Infração',
    icon: 'fa-triangle-exclamation',
    description: 'Outro tipo de estacionamento não autorizado',
    color: 'text-yellow-500',
  },
];

export const inputBase =
  'w-full rounded-xl px-4 py-3 bg-card border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all';
export const inputError = 'border-error focus:ring-error/40 focus:border-error';
