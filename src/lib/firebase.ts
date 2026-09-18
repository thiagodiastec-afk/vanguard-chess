import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, setPersistence, browserSessionPersistence } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

let app: any;
let db: any;
let auth: any;

export const initFirebase = async () => {
  if (app && db && auth) return { app, db, auth };
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    auth = getAuth(app);
    // Configura persistência apenas para a sessão atual da janela/aba
    // Ao fechar a aba/navegador, a sessão expira e o login é exigido novamente
    await setPersistence(auth, browserSessionPersistence);
    return { app, db, auth };
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    throw error;
  }
};

export const getDb = () => db;
export const getFirebaseAuth = () => auth;

