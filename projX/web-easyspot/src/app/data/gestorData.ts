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
}

export interface TariffEntry {
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
  metodo: 'OCR' | 'Manual';
  duracao: string;
  valorEstacionamento: number;
  valorEV?: number;
  total: number;
  estado: 'pago' | 'pendente' | 'contestado';
}

export const mockTariffs: TariffEntry[] = [];
export const mockBillingRecords: BillingRecord[] = [];
export const mockDailyMetrics: DailyMetric[] = [];
export const mockHourlyOccupancy: HourlyOccupancy[] = [];
export const mockZoneOccupancy: ZoneOccupancy[] = [];
export const mockIssues: IssueReport[] = [];

export const mockManagerKPIs = {
  entradasHoje: 0,
  variacaoEntradas: 0,
  taxaOcupacaoMedia: 0,
  totalLugares: 0,
  lugaresLivres: 0,
  receitaHoje: 0,
  variacaoReceita: 0,
  tempoMedioEstadia: '0 min',
  alertasAbertos: 0,
};
