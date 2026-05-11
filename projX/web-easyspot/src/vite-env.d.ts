/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTHENTIK_URL: string;
  readonly VITE_AUTHENTIK_CLIENT_ID: string;
  readonly VITE_AUTHENTIK_REDIRECT_URI: string;
  readonly VITE_FIREBASE_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
