import re

with open("src/App.tsx", "r") as f:
    code = f.read()

# Fix imports
code = code.replace(
    "import { getAuth as getFirebaseAuth, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';",
    "import { getAuth as getFirebaseAuth, signInWithPopup, GoogleAuthProvider, signOut, User, browserPopupRedirectResolver } from 'firebase/auth';"
)

code = code.replace(
    "import { initFirebase, getDb } from './lib/firebase';",
    "import { initFirebase, getDb, getFirebaseAuth as getFirebaseInstance } from './lib/firebase';"
)

# Fix handleLogin
old_login = """  const handleLogin = async () => {
    try {
      const { auth } = await initFirebase();
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login error", error);
    }
  };"""

new_login = """  const handleLogin = async () => {
    try {
      // Must be synchronous before calling signInWithPopup to avoid browser popup blockers
      const auth = getFirebaseInstance();
      if (!auth) {
        console.error("Firebase auth not initialized yet.");
        // Fallback to async if somehow not initialized
        const { auth: asyncAuth } = await initFirebase();
        const provider = new GoogleAuthProvider();
        await signInWithPopup(asyncAuth, provider, browserPopupRedirectResolver);
        return;
      }
      
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    } catch (error) {
      console.error("Login error", error);
      alert("Falha ao abrir a janela de login. Se você estiver usando Safari ou bloqueadores de pop-up, tente permitir pop-ups para esta página ou clique no botão de 'Device' ou 'Remix' no canto superior direito para abrir o app em uma nova guia.");
    }
  };"""

code = code.replace(old_login, new_login)

with open("src/App.tsx", "w") as f:
    f.write(code)

