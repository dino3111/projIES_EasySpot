import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, getToken } from 'firebase/app-check';

declare global {
  interface Window {
    FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string;
  }
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyC0ToM3KDiIgN_cvvRQNmS_0v9a3_oZM9Q',
  authDomain: 'auth.infomatricula.pt',
  projectId: 'infomatricula-login',
  storageBucket: 'infomatricula-login.appspot.com',
  messagingSenderId: '513358804534',
  appId: '1:513358804534:web:1e27661c1aea0c2fc6ca97',
  measurementId: 'G-GL6LV5Y0QF',
};

const RECAPTCHA_SITE_KEY = '6LeHolkqAAAAAC_JbtJkbs5OPNvoo4V3zulvGzUH';
const appCheckDebugToken = import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN;

if (appCheckDebugToken && typeof window !== 'undefined') {
  window.FIREBASE_APPCHECK_DEBUG_TOKEN = appCheckDebugToken === 'true' ? true : appCheckDebugToken;
  console.info('[AppCheck] Debug token mode enabled');
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_SITE_KEY),
  isTokenAutoRefreshEnabled: true,
});
const auth = getAuth(app);

export async function getAppCheckToken(): Promise<string> {
  console.debug('[InfoMatricula][AppCheck] requesting token');
  try {
    const result = await getToken(appCheck);
    console.debug('[InfoMatricula][AppCheck] token received', { length: result.token.length });
    return result.token;
  } catch (error) {
    console.error('[InfoMatricula][AppCheck] token failed', {
      hostname: window.location.hostname,
      origin: window.location.origin,
      error,
    });
    throw error;
  }
}

export async function getFirebaseIdToken(): Promise<string> {
  if (!auth.currentUser) {
    try {
      await getAppCheckToken();
      console.debug('[InfoMatricula][FirebaseAuth] signing in anonymously');
      await signInAnonymously(auth);
      console.debug('[InfoMatricula][FirebaseAuth] anonymous sign-in ok', {
        uid: auth.currentUser?.uid,
      });
    } catch (error) {
      console.error('[InfoMatricula][FirebaseAuth] anonymous sign-in failed', error);
      throw error;
    }
  }
  const idToken = await auth.currentUser!.getIdToken();
  console.debug('[InfoMatricula][FirebaseAuth] id token received', { length: idToken.length });
  return idToken;
}
