export interface DailyMetric {
  date: string;
  day: string;
  entradas: number;
  saidas: number;
  receita: number;
  ocupacao: number; // percentagem
}

export interface ZoneOccupancy {
  name: string;
  total: number;
  ocupados: number;
  type: 'standard' | 'ev' | 'accessible' | 'reserved';
  color: string;
}

export interface HourlyOccupancy {
  hora: string;
  ocupacao: number;
}

export interface IssueReport {
  id: string;
  tipo: 'sensor' | 'cliente' | 'sistema';
  parque: string;
  zona?: string;
  sensorId?: string;
  matricula?: string;
  descricao: string;
  severidade: 'critica' | 'aviso' | 'info';
  estado: 'aberto' | 'em-progresso' | 'resolvido';
  criadoEm: string;
  atribuidoA?: string;
  notas?: string;
  fotoUrl?: string;
}

export interface TariffEntry {
  id?: string;
  parqueId: string;
  parqueNome: string;
  cidade: string;
  tarifaHora: number;
  maxDiario: number;
  mensalidade: number;
  tarifaEV?: number; // por kWh
  temAcessivel: boolean;
  ultimaAtualizacao: string;
  estado: 'ativo' | 'revisao' | 'suspenso';
}

export interface BillingRecord {
  id: string;
  parqueNome: string;
  data: string;
  matricula: string;
  metodo: 'OCR' | 'RFID' | 'Manual';
  duracao: string;
  valorEstacionamento: number;
  valorEV?: number;
  total: number;
  estado: 'pago' | 'pendente' | 'contestado';
}
