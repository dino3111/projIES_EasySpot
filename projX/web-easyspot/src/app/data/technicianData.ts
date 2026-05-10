// ── Dados mock para o painel do Técnico de Manutenção (Laura Farias) ─────────

export type SensorTipo = 'IR' | 'OCR' | 'EV' | 'Gateway';
export type SensorStatus = 'operacional' | 'falha' | 'offline' | 'manutencao';

export interface ErrorLog {
  id: string;
  timestamp: string;
  codigo: string;
  descricao: string;
  resolvido: boolean;
}

export interface SensorDevice {
  id: string;
  tipo: SensorTipo;
  parqueId: string;
  parqueNome: string;
  cidade: string;
  zona: string;
  lugar?: string;
  status: SensorStatus;
  ultimaLeitura: string;
  uptimePercent: number;
  taxaFalsosPositivos: number;
  firmware: string;
  instaladoEm: string;
  ultimaManutencao: string;
  historicoErros: ErrorLog[];
}

export interface MaintenanceOrder {
  id: string;
  sensorId: string;
  parque: string;
  zona: string;
  titulo: string;
  descricao: string;
  prioridade: 'critica' | 'alta' | 'media' | 'baixa';
  estado: 'pendente' | 'em-progresso' | 'concluida';
  criadaEm: string;
  prazo?: string;
  notas?: string;
  tecnico: string;
}

export interface TechKPI {
  totalSensores: number;
  operacionais: number;
  emFalha: number;
  offline: number;
  emManutencao: number;
  uptimeMedio: number;
  taxaFalsosPositivos: number;
  mttrHoras: number;
  ordensAbertas: number;
  ordensConcluidas7dias: number;
}