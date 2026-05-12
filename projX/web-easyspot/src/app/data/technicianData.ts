export type SensorTipo = 'IR' | 'Entrada' | 'OCR' | 'EV' | 'Gateway';
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

export function computeTechKPIs(sensors: SensorDevice[]): TechKPI {
  const total = sensors.length;
  if (total === 0) {
    return {
      totalSensores: 0, operacionais: 0, emFalha: 0, offline: 0, emManutencao: 0,
      uptimeMedio: 0, taxaFalsosPositivos: 0, mttrHoras: 0, ordensAbertas: 0, ordensConcluidas7dias: 0,
    };
  }
  const operacionais  = sensors.filter(s => s.status === 'operacional').length;
  const emFalha       = sensors.filter(s => s.status === 'falha').length;
  const offline       = sensors.filter(s => s.status === 'offline').length;
  const emManutencao  = sensors.filter(s => s.status === 'manutencao').length;
  const uptimeMedio   = sensors.reduce((acc, s) => acc + s.uptimePercent, 0) / total;
  const sensoresComFP = sensors.filter(s => s.taxaFalsosPositivos > 0);
  const taxaFP        = sensoresComFP.length > 0
    ? sensoresComFP.reduce((acc, s) => acc + s.taxaFalsosPositivos, 0) / sensoresComFP.length
    : 0;
  return {
    totalSensores: total,
    operacionais,
    emFalha,
    offline,
    emManutencao,
    uptimeMedio:          Math.round(uptimeMedio * 10) / 10,
    taxaFalsosPositivos:  Math.round(taxaFP * 10) / 10,
    mttrHoras:            4.2,
    ordensAbertas:        emFalha + offline,
    ordensConcluidas7dias: 0,
  };
}
