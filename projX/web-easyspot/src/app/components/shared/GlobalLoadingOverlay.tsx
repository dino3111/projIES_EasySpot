import { useEffect } from 'react';
import { useLoading } from '../../context/LoadingContext';

export function GlobalLoadingOverlay() {
  const { isLoading, startLoading, stopLoading } = useLoading();

  useEffect(() => {
    const onStart = () => startLoading();
    const onStop = () => stopLoading();

    globalThis.addEventListener('easyspot:loading-start', onStart);
    globalThis.addEventListener('easyspot:loading-stop', onStop);

    return () => {
      globalThis.removeEventListener('easyspot:loading-start', onStart);
      globalThis.removeEventListener('easyspot:loading-stop', onStop);
    };
  }, [startLoading, stopLoading]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/70 backdrop-blur-sm" role="status" aria-live="polite" aria-busy="true">
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-5 shadow-xl">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <p className="text-sm font-medium text-foreground">A carregar dados...</p>
      </div>
    </div>
  );
}
