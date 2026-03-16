// ── Dados mock para o painel do Gestor (António Videira) ──────────────────────

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
  metodo: 'OCR' | 'RFID' | 'Manual';
  duracao: string;
  valorEstacionamento: number;
  valorEV?: number;
  total: number;
  estado: 'pago' | 'pendente' | 'contestado';
}

// ─── Métricas diárias (últimos 7 dias) ──────────────────────────────────────
export const mockDailyMetrics: DailyMetric[] = [
  { date: '2026-03-03', day: 'Ter', entradas: 312, saidas: 298, receita: 1840.50, ocupacao: 72 },
  { date: '2026-03-04', day: 'Qua', entradas: 287, saidas: 291, receita: 1620.30, ocupacao: 65 },
  { date: '2026-03-05', day: 'Qui', entradas: 345, saidas: 330, receita: 2105.00, ocupacao: 78 },
  { date: '2026-03-06', day: 'Sex', entradas: 421, saidas: 408, receita: 2890.75, ocupacao: 88 },
  { date: '2026-03-07', day: 'Sáb', entradas: 398, saidas: 385, receita: 2650.20, ocupacao: 84 },
  { date: '2026-03-08', day: 'Dom', entradas: 265, saidas: 270, receita: 1380.90, ocupacao: 58 },
  { date: '2026-03-09', day: 'Seg', entradas: 303, saidas: 289, receita: 1745.60, ocupacao: 69 },
].map((item, idx) => ({ ...item, key: `daily-${item.date}-${idx}` }));

// ─── Ocupação por hora (hoje) ─────────────────────────────────────────────────
export const mockHourlyOccupancy: HourlyOccupancy[] = [
  { hora: '07h', ocupacao: 15 },
  { hora: '08h', ocupacao: 42 },
  { hora: '09h', ocupacao: 68 },
  { hora: '10h', ocupacao: 75 },
  { hora: '11h', ocupacao: 80 },
  { hora: '12h', ocupacao: 85 },
  { hora: '13h', ocupacao: 78 },
  { hora: '14h', ocupacao: 72 },
  { hora: '15h', ocupacao: 74 },
  { hora: '16h', ocupacao: 82 },
  { hora: '17h', ocupacao: 88 },
  { hora: '18h', ocupacao: 76 },
  { hora: '19h', ocupacao: 54 },
  { hora: '20h', ocupacao: 35 },
  { hora: '21h', ocupacao: 20 },
].map((item, idx) => ({ ...item, key: `hourly-${item.hora}-${idx}` }));

// ─── Ocupação por zona ────────────────────────────────────────────────────────
export const mockZoneOccupancy: ZoneOccupancy[] = [
  { name: 'Normal', total: 680, ocupados: 510, type: 'standard', color: '#7357ec' },
  { name: 'Carregamento EV', total: 80, ocupados: 52, type: 'ev', color: '#22c55e' },
  { name: 'Mobilidade Reduzida', total: 40, ocupados: 18, type: 'accessible', color: '#3b82f6' },
  { name: 'Reservados', total: 60, ocupados: 48, type: 'reserved', color: '#f59e0b' },
];

// ─── Registo de ocorrências ───────────────────────────────────────────────────
export const mockIssues: IssueReport[] = [
  {
    id: 'iss-001',
    tipo: 'sensor',
    parque: 'Fórum Aveiro',
    zona: 'Piso 0 – Zona B',
    sensorId: 'IR-AV1-B07',
    descricao: 'Sensor infravermelho não reporta leituras há mais de 2 horas. LED do lugar B7 continua verde apesar de estar ocupado.',
    severidade: 'critica',
    estado: 'aberto',
    criadoEm: '2026-03-09T08:14:00',
    atribuidoA: 'Laura Farias',
  },
  {
    id: 'iss-002',
    tipo: 'cliente',
    parque: 'Glicínias Plaza',
    zona: 'Piso -1',
    matricula: '55-AB-23',
    descricao: 'Condutor reporta cobrança incorreta: estacionou 45 min mas foi cobrado 2 horas. Entrada registada via OCR às 14h02.',
    severidade: 'aviso',
    estado: 'em-progresso',
    criadoEm: '2026-03-09T16:30:00',
    atribuidoA: 'Suporte EasySpot',
    notas: 'A verificar logs de entrada/saída no sistema OCR.',
  },
  {
    id: 'iss-003',
    tipo: 'sensor',
    parque: 'Estádio Cidade de Coimbra',
    zona: 'Piso -1 – Mobilidade Reduzida',
    sensorId: 'IR-CO1-MR02',
    descricao: 'Sensor do lugar de mobilidade reduzida MR-02 em falha. Possível colocação indevida por condutor sem autorização.',
    severidade: 'critica',
    estado: 'aberto',
    criadoEm: '2026-03-09T10:05:00',
  },
  {
    id: 'iss-004',
    tipo: 'sistema',
    parque: 'Europa – Leiria',
    descricao: 'Leitor RFID da entrada principal sem comunicação com o servidor central desde as 06h45. Veículos a entrar sem registo automático.',
    severidade: 'critica',
    estado: 'em-progresso',
    criadoEm: '2026-03-09T06:50:00',
    atribuidoA: 'Laura Farias',
    notas: 'Técnico a caminho. Estimativa de resolução: 11h00.',
  },
  {
    id: 'iss-005',
    tipo: 'cliente',
    parque: 'Foz Plaza',
    matricula: '73-CD-98',
    descricao: 'Cliente reporta que o lugar de carregamento EV que reservou estava ocupado por veículo convencional.',
    severidade: 'aviso',
    estado: 'resolvido',
    criadoEm: '2026-03-08T14:20:00',
    atribuidoA: 'Suporte EasySpot',
    notas: 'Reembolso processado. Imagem captada por câmera às 14h18.',
  },
  {
    id: 'iss-006',
    tipo: 'sensor',
    parque: 'Mercado Municipal de Arganil',
    zona: 'Piso 0 – Zona A',
    sensorId: 'IR-AR1-A12',
    descricao: 'Falha intermitente no sensor A12. Leituras inconsistentes nas últimas 4 horas (taxa de falsos-positivos: 34%).',
    severidade: 'aviso',
    estado: 'aberto',
    criadoEm: '2026-03-09T07:30:00',
  },
  {
    id: 'iss-007',
    tipo: 'sistema',
    parque: 'CoimbraShopping',
    descricao: 'Câmera OCR da saída sem imagem. Matrículas não estão a ser registadas na saída desde as 19h30 de ontem.',
    severidade: 'aviso',
    estado: 'em-progresso',
    criadoEm: '2026-03-08T19:35:00',
    atribuidoA: 'Laura Farias',
  },
  {
    id: 'iss-008',
    tipo: 'cliente',
    parque: 'Praia do Furadouro',
    matricula: '41-EF-77',
    descricao: 'Utilizador reporta que a app mostrava 10 lugares livres mas ao chegar o parque estava cheio.',
    severidade: 'info',
    estado: 'resolvido',
    criadoEm: '2026-03-07T11:10:00',
    notas: 'Desfasamento de dados entre sensor e API corrigido na versão 1.0.2.',
  },
];

// ─── Tarifários ──────────────────────────────────────────────────────────────
export const mockTariffs: TariffEntry[] = [
  {
    parqueId: 'coimbra-1',
    parqueNome: 'Estádio Cidade de Coimbra',
    cidade: 'Coimbra',
    tarifaHora: 1.80,
    maxDiario: 14.00,
    mensalidade: 140.00,
    tarifaEV: 0.32,
    temAcessivel: true,
    ultimaAtualizacao: '2026-02-15',
    estado: 'ativo',
  },
  {
    parqueId: 'coimbra-2',
    parqueNome: 'CoimbraShopping',
    cidade: 'Coimbra',
    tarifaHora: 1.50,
    maxDiario: 12.00,
    mensalidade: 110.00,
    temAcessivel: true,
    ultimaAtualizacao: '2026-01-20',
    estado: 'revisao',
  },
  {
    parqueId: 'aveiro-1',
    parqueNome: 'Fórum Aveiro',
    cidade: 'Aveiro',
    tarifaHora: 1.50,
    maxDiario: 12.00,
    mensalidade: 120.00,
    tarifaEV: 0.38,
    temAcessivel: true,
    ultimaAtualizacao: '2026-02-28',
    estado: 'ativo',
  },
  {
    parqueId: 'aveiro-2',
    parqueNome: 'Glicínias Plaza',
    cidade: 'Aveiro',
    tarifaHora: 1.00,
    maxDiario: 8.00,
    mensalidade: 80.00,
    tarifaEV: 0.30,
    temAcessivel: true,
    ultimaAtualizacao: '2026-03-01',
    estado: 'ativo',
  },
  {
    parqueId: 'leiria-1',
    parqueNome: 'Europa',
    cidade: 'Leiria',
    tarifaHora: 1.60,
    maxDiario: 13.00,
    mensalidade: 130.00,
    temAcessivel: true,
    ultimaAtualizacao: '2026-02-10',
    estado: 'ativo',
  },
  {
    parqueId: 'leiria-2',
    parqueNome: 'Estádio Mag. Pessoa',
    cidade: 'Leiria',
    tarifaHora: 0.80,
    maxDiario: 6.00,
    mensalidade: 50.00,
    tarifaEV: 0.28,
    temAcessivel: true,
    ultimaAtualizacao: '2026-02-20',
    estado: 'ativo',
  },
  {
    parqueId: 'figueira-1',
    parqueNome: 'Gaivotas',
    cidade: 'Figueira da Foz',
    tarifaHora: 1.00,
    maxDiario: 8.00,
    mensalidade: 70.00,
    temAcessivel: true,
    ultimaAtualizacao: '2026-01-10',
    estado: 'revisao',
  },
  {
    parqueId: 'figueira-2',
    parqueNome: 'Foz Plaza',
    cidade: 'Figueira da Foz',
    tarifaHora: 1.20,
    maxDiario: 10.00,
    mensalidade: 90.00,
    tarifaEV: 0.35,
    temAcessivel: true,
    ultimaAtualizacao: '2026-03-05',
    estado: 'ativo',
  },
  {
    parqueId: 'arganil-1',
    parqueNome: 'Mercado Municipal de Arganil',
    cidade: 'Arganil',
    tarifaHora: 0.60,
    maxDiario: 4.50,
    mensalidade: 45.00,
    tarifaEV: 0.25,
    temAcessivel: true,
    ultimaAtualizacao: '2026-02-01',
    estado: 'ativo',
  },
  {
    parqueId: 'arganil-2',
    parqueNome: 'Montalto',
    cidade: 'Arganil',
    tarifaHora: 0.30,
    maxDiario: 2.50,
    mensalidade: 20.00,
    temAcessivel: true,
    ultimaAtualizacao: '2025-12-15',
    estado: 'suspenso',
  },
];

// ─── Histórico de faturação ───────────────────────────────────────────────────
export const mockBillingRecords: BillingRecord[] = [
  { id: 'bil-001', parqueNome: 'Fórum Aveiro', data: '2026-03-09 08:32', matricula: '22-AB-44', metodo: 'RFID', duracao: '3h 15m', valorEstacionamento: 4.50, valorEV: 7.22, total: 11.72, estado: 'pago' },
  { id: 'bil-002', parqueNome: 'Glicínias Plaza', data: '2026-03-09 09:01', matricula: '55-CD-12', metodo: 'OCR', duracao: '1h 00m', valorEstacionamento: 1.00, total: 1.00, estado: 'pago' },
  { id: 'bil-003', parqueNome: 'Europa – Leiria', data: '2026-03-09 07:45', matricula: '77-EF-88', metodo: 'RFID', duracao: '2h 30m', valorEstacionamento: 4.00, total: 4.00, estado: 'pago' },
  { id: 'bil-004', parqueNome: 'Estádio Coimbra', data: '2026-03-09 10:10', matricula: '11-GH-55', metodo: 'OCR', duracao: '4h 00m', valorEstacionamento: 7.20, total: 7.20, estado: 'pendente' },
  { id: 'bil-005', parqueNome: 'Glicínias Plaza', data: '2026-03-09 14:02', matricula: '55-AB-23', metodo: 'OCR', duracao: '2h 00m', valorEstacionamento: 2.00, total: 2.00, estado: 'contestado' },
  { id: 'bil-006', parqueNome: 'Foz Plaza', data: '2026-03-08 11:20', matricula: '73-CD-98', metodo: 'RFID', duracao: '5h 10m', valorEstacionamento: 6.20, valorEV: 9.80, total: 16.00, estado: 'pago' },
  { id: 'bil-007', parqueNome: 'Fórum Aveiro', data: '2026-03-08 13:45', matricula: '99-IJ-01', metodo: 'OCR', duracao: '0h 45m', valorEstacionamento: 1.50, total: 1.50, estado: 'pago' },
  { id: 'bil-008', parqueNome: 'Mercado de Arganil', data: '2026-03-08 15:00', matricula: '44-KL-22', metodo: 'RFID', duracao: '2h 00m', valorEstacionamento: 1.20, total: 1.20, estado: 'pago' },
];

// ─── KPIs do gestor (hoje) ────────────────────────────────────────────────────
export const mockManagerKPIs = {
  entradasHoje: 303,
  taxaOcupacaoMedia: 69,
  receitaHoje: 1745.60,
  tempoMedioEstadia: '2h 14m',
  alertasAbertos: mockIssues.filter(i => i.estado === 'aberto').length,
  parquesAtivos: 9,
  totalLugares: 1143,
  lugaresLivres: 374,
  variacaoEntradas: +14.4, // % vs dia anterior
  variacaoReceita: +26.4, // % vs dia anterior
};