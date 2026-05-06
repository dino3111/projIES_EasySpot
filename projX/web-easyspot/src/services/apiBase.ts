const configuredApiBase = import.meta.env.VITE_API_BASE_URL;

function resolveDevApiBase(): string {
  if (typeof window === 'undefined') return '';
  if (window.location.port === '5173') {
    return `${window.location.protocol}//${window.location.hostname}`;
  }
  return '';
}

export const API_BASE = configuredApiBase ?? resolveDevApiBase();
