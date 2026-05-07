const configuredApiBase = import.meta.env.VITE_API_BASE_URL;

function resolveDevApiBase(): string {
  if (typeof globalThis.window === 'undefined') return '';
  if (globalThis.location.port === '5173') {
    return `${globalThis.location.protocol}//${globalThis.location.hostname}`;
  }
  return '';
}

export const API_BASE = configuredApiBase ?? resolveDevApiBase();
