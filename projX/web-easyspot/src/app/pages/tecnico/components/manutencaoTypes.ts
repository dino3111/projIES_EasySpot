import { mockSensors, type SensorStatus } from '../../../data/technicianData';
import { mockIssues } from '../../../data/gestorData';

export const STATUS_COLOR: Record<SensorStatus, string> = {
  operacional: '#22c55e',
  falha:       '#d4183d',
  offline:     '#6b7280',
  manutencao:  '#f59e0b',
};
export const STATUS_LABEL: Record<SensorStatus, string> = {
  operacional: 'Operacional',
  falha:       'Falha',
  offline:     'Offline',
  manutencao:  'Manutenção',
};
export const STATUS_ICON: Record<SensorStatus, string> = {
  operacional: 'fa-circle-check',
  falha:       'fa-circle-xmark',
  offline:     'fa-circle-minus',
  manutencao:  'fa-wrench',
};
export const TIPO_ICON: Record<string, string> = {
  IR:      'fa-microchip',
  RFID:    'fa-wifi',
  OCR:     'fa-camera',
  EV:      'fa-bolt',
  Gateway: 'fa-network-wired',
};
export const PRIO_COLOR: Record<string, string> = {
  critica: '#d4183d',
  alta:    '#f59e0b',
  media:   '#3b82f6',
  baixa:   '#6b7280',
};
export const PRIO_LABEL: Record<string, string> = {
  critica: 'Crítica',
  alta:    'Alta',
  media:   'Média',
  baixa:   'Baixa',
};

export type PageTab = 'ocorrencias' | 'sensores' | 'tarefas';
export type StatusFil = 'todos' | SensorStatus;
export type TarefaFiltro = 'urgente' | 'em-progresso' | 'pendente' | 'concluida';

export interface ParkManager {
  parkId: string;
  parkName: string;
  managerName: string;
  email: string;
  phone: string;
}

export const parkManagers: ParkManager[] = [
  { parkId: 'coimbra-1', parkName: 'Estádio Cidade de Coimbra',  managerName: 'Dr. João Silva',      email: 'joao.silva@estadio-coimbra.pt',     phone: '+351 239 800 001' },
  { parkId: 'coimbra-2', parkName: 'CoimbraShopping',             managerName: 'Dra. Maria Santos',    email: 'maria.santos@coimbrashopping.pt',    phone: '+351 239 800 011' },
  { parkId: 'aveiro-1',  parkName: 'Fórum Aveiro',                managerName: 'Eng. Carlos Mendes',   email: 'carlos.mendes@forum-aveiro.pt',      phone: '+351 234 123 456' },
  { parkId: 'aveiro-2',  parkName: 'Glicínias Plaza',             managerName: 'Dra. Helena Costa',    email: 'helena.costa@gliciniasplaza.pt',     phone: '+351 234 234 567' },
  { parkId: 'leiria-1',  parkName: 'Europa – Leiria',             managerName: 'Eng. Ricardo Oliveira',email: 'ricardo.oliveira@europa-leiria.pt',  phone: '+351 244 800 100' },
  { parkId: 'leiria-2',  parkName: 'CentroLeiriaShopping',        managerName: 'Dr. Nuno Ferreira',    email: 'nuno.ferreira@centroleiria.pt',      phone: '+351 244 800 111' },
];

export const techIssues = mockIssues.filter(i => i.tipo === 'sensor' || i.tipo === 'sistema');

export const parkCityMapFromSensors = (): Map<string, string> => {
  const map = new Map<string, string>();
  mockSensors.forEach(s => { if (!map.has(s.parqueNome)) map.set(s.parqueNome, s.cidade); });
  return map;
};
