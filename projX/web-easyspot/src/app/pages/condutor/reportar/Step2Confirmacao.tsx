import type { ReactNode } from 'react';
import { mockParkingLots } from '../../../data/parkingData';
import { violationTypes, type ReportForm } from './reportarTypes';

function DetailRow({ icon, label, children }: { icon: string; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <i className={`fas ${icon} text-muted-foreground mt-0.5 w-4 flex-shrink-0`} style={{ fontSize: '0.8rem' }} />
      <div className="flex-1">
        <p className="text-muted-foreground" style={{ fontSize: '0.72rem' }}>{label}</p>
        <p className="text-foreground font-semibold" style={{ fontSize: '0.85rem' }}>{children}</p>
      </div>
    </div>
  );
}

interface Props {
  reportId: string;
  form: ReportForm;
  onViewReports: () => void;
  onNewReport: () => void;
  onGoHome: () => void;
}

export function Step2Confirmacao({ reportId, form, onViewReports, onNewReport, onGoHome }: Props) {
  const selectedLot = mockParkingLots.find((p) => p.id === form.parkingLotId);
  const violationType = violationTypes.find((v) => v.id === form.violationType);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="max-w-lg w-full">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-success/15 flex items-center justify-center">
              <i className="fas fa-check text-success" style={{ fontSize: '2rem' }} />
            </div>
            <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <i className="fas fa-flag text-white" style={{ fontSize: '0.7rem' }} />
            </span>
          </div>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-foreground" style={{ fontSize: '1.5rem', fontWeight: 800 }}>Denúncia Enviada!</h1>
          <p className="text-muted-foreground mt-1.5" style={{ fontSize: '0.875rem' }}>
            A sua denúncia foi registada. A equipa de gestão irá analisar e atuar em conformidade.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden mb-5 shadow-sm">
          <div className="bg-primary/8 border-b border-border px-5 py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
              <i className={`fas ${violationType?.icon} text-primary`} style={{ fontSize: '1rem' }} />
            </div>
            <div className="flex-1">
              <p className="text-foreground font-bold" style={{ fontSize: '0.9rem' }}>{violationType?.label}</p>
              <p className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>Referência #{reportId}</p>
            </div>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning/15 text-warning border border-warning/30" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
              <i className="fas fa-hourglass-half" style={{ fontSize: '0.6rem' }} />Em análise
            </span>
          </div>

          <div className="px-5 py-4 space-y-3.5">
            <DetailRow icon="fa-location-dot" label="Local">
              {selectedLot?.name} — {form.zone}, Lugar {form.spotNumber}
            </DetailRow>
            {form.vehiclePlate && (
              <DetailRow icon="fa-car" label="Matrícula">
                <span className="font-mono tracking-widest">{form.vehiclePlate}</span>
              </DetailRow>
            )}
            <DetailRow icon="fa-clock" label="Data e Hora">
              {new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </DetailRow>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 mb-6">
          <h3 className="text-foreground flex items-center gap-2 mb-3.5" style={{ fontSize: '0.875rem', fontWeight: 700 }}>
            <i className="fas fa-lightbulb text-primary" />Próximos Passos
          </h3>
          <ul className="space-y-2.5">
            {[
              { icon: 'fa-circle-check',   color: 'text-success', text: 'A equipa de gestão recebeu a sua denúncia' },
              { icon: 'fa-magnifying-glass', color: 'text-primary', text: 'Verificação no local nas próximas 2 horas' },
              { icon: 'fa-gavel',          color: 'text-warning', text: 'Se confirmada, serão tomadas medidas apropriadas' },
              { icon: 'fa-bell',           color: 'text-info',    text: 'Receberá notificação quando o estado for atualizado' },
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <i className={`fas ${item.icon} ${item.color} mt-0.5 flex-shrink-0`} style={{ fontSize: '0.8rem' }} />
                <span className="text-muted-foreground" style={{ fontSize: '0.82rem' }}>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2.5">
          <button
            onClick={onViewReports}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-primary text-white font-semibold hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all"
            style={{ fontSize: '0.9rem' }}
          >
            <i className="fas fa-list" />Ver as Minhas Denúncias
          </button>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={onNewReport}
              className="flex items-center justify-center gap-2 py-3 rounded-full border-2 border-primary text-primary font-semibold hover:bg-primary/8 transition-colors"
              style={{ fontSize: '0.85rem' }}
            >
              <i className="fas fa-plus" />Nova Denúncia
            </button>
            <button
              onClick={onGoHome}
              className="flex items-center justify-center gap-2 py-3 rounded-full border border-border text-foreground font-semibold hover:bg-muted transition-colors"
              style={{ fontSize: '0.85rem' }}
            >
              <i className="fas fa-house" />Início
            </button>
          </div>
        </div>

        <p className="text-center text-muted-foreground mt-5" style={{ fontSize: '0.75rem' }}>
          Dúvidas?{' '}
          <a href="mailto:suporte@easyspot.pt" className="text-primary font-semibold hover:underline">
            suporte@easyspot.pt
          </a>
        </p>
      </div>
    </div>
  );
}
