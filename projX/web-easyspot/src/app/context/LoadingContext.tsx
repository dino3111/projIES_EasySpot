import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type LoadingContextType = {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
  trackPromise: <T>(promise: Promise<T>) => Promise<T>;
};

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { readonly children: ReactNode }) {
  const [pendingRequests, setPendingRequests] = useState(0);

  const startLoading = useCallback(() => {
    setPendingRequests((prev) => prev + 1);
  }, []);

  const stopLoading = useCallback(() => {
    setPendingRequests((prev) => (prev > 0 ? prev - 1 : 0));
  }, []);

  const trackPromise = useCallback(async <T,>(promise: Promise<T>): Promise<T> => {
    startLoading();
    try {
      return await promise;
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading]);

  const value = useMemo(() => ({
    isLoading: pendingRequests > 0,
    startLoading,
    stopLoading,
    trackPromise,
  }), [pendingRequests, startLoading, stopLoading, trackPromise]);

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) throw new Error('useLoading must be used within LoadingProvider');
  return context;
}

export function withGlobalLoading<T>(promiseFactory: () => Promise<T>): Promise<T> {
  if (typeof window === 'undefined') return promiseFactory();

  window.dispatchEvent(new CustomEvent('easyspot:loading-start'));
  return promiseFactory().finally(() => {
    window.dispatchEvent(new CustomEvent('easyspot:loading-stop'));
  });
}
