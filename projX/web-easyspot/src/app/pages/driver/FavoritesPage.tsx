import { Link } from 'react-router';

export function FavoritesPage() {
  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-5 h-full transition-colors duration-300">
      <div className="mb-5">
        <h1
          className="text-foreground"
          style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.2 }}
        >
          Favoritos
        </h1>
        <p className="text-muted-foreground mt-1" style={{ fontSize: '0.875rem' }}>
          Os seus parques guardados
        </p>
      </div>

      {/* Estado vazio */}
      <div
        className="flex flex-col items-center justify-center rounded-2xl py-16 px-6 text-center bg-card border-2 border-dashed border-border"
        role="status"
        aria-label="Nenhum favorito guardado"
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-4 bg-primary/10"
          aria-hidden="true"
        >
          <i className="fas fa-star text-primary" style={{ fontSize: '2rem' }}></i>
        </div>
        <h2 className="text-foreground font-bold mb-2" style={{ fontSize: '1.1rem' }}>
          Sem favoritos ainda
        </h2>
        <p className="text-muted-foreground max-w-xs leading-relaxed mb-6" style={{ fontSize: '0.875rem' }}>
          Guarde os seus parques preferidos para acesso rápido. Toque na estrela
          <i className="fas fa-star mx-1 text-warning" aria-hidden="true"></i>
          na página de detalhe de qualquer parque.
        </p>
        <Link
          to="/"
          className="btn btn-primary rounded-xl px-6 font-bold no-underline"
          aria-label="Explorar parques disponíveis"
        >
          <i className="fas fa-magnifying-glass" aria-hidden="true"></i>
          Explorar Parques
        </Link>
      </div>

      {/* Dica */}
      <div
        className="flex items-start gap-3 rounded-xl p-4 mt-4 bg-card border border-border"
        role="note"
      >
        <i className="fas fa-lightbulb mt-0.5 flex-shrink-0 text-warning" aria-hidden="true"></i>
        <div>
          <p className="text-foreground font-bold mb-0.5" style={{ fontSize: '0.8rem' }}>
            Dica
          </p>
          <p className="text-muted-foreground leading-relaxed" style={{ fontSize: '0.78rem' }}>
            Ao guardar parques como favoritos, receberá notificações quando a disponibilidade mudar
            e poderá reservar mais rapidamente.
          </p>
        </div>
      </div>
    </div>
  );
}
