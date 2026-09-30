import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { getFirestore } from 'firebase/firestore';
import { getAuth, setPersistence, browserSessionPersistence } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

let app: any;
let db: any;
let auth: any;
let appCheck: ReturnType<typeof initializeAppCheck> | undefined;

export const initFirebase = async () => {
  if (app && db && auth) return { app, db, auth };
  try {
    app = initializeApp(firebaseConfig);
    const appCheckSiteKey = (
      import.meta.env.VITE_FIREBASE_APPCHECK_RECAPTCHA_ENTERPRISE_SITE_KEY ||
      firebaseConfig.recaptchaSiteKey
    )?.trim();
    if (appCheckSiteKey) {
      // App Check must be initialized before the Firebase services below.
      appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } else if (import.meta.env.PROD) {
      console.warn('Firebase App Check is not initialized: set VITE_FIREBASE_APPCHECK_RECAPTCHA_ENTERPRISE_SITE_KEY after registering the web app.');
    }
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    auth = getAuth(app);
    // Configura persistência apenas para a sessão atual da janela/aba
    // Ao fechar a aba/navegador, a sessão expira e o login é exigido novamente
    await setPersistence(auth, browserSessionPersistence);
    return { app, db, auth, appCheck };
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    throw error;
  }
};

export const getDb = () => db;
export const getFirebaseAuth = () => auth;
