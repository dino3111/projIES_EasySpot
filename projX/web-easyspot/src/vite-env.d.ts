/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTHENTIK_URL?: string;
  readonly VITE_AUTHENTIK_CLIENT_ID?: string;
  readonly VITE_AUTHENTIK_REDIRECT_URI?: string;
  readonly VITE_AUTHENTIK_LOGOUT_REDIRECT_URI?: string;
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_DISABLE_REALTIME_ALERTS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
