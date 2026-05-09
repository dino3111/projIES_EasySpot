const configuredApiBase = import.meta.env.VITE_API_BASE_URL;

function resolveDevApiBase(): string {
  if (typeof globalThis.window === 'undefined') return '';
  return globalThis.location.origin;
}

export const API_BASE = configuredApiBase ?? resolveDevApiBase();
