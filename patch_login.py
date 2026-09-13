import re

with open("src/App.tsx", "r") as f:
    code = f.read()

# Add signInWithRedirect to imports
code = code.replace("signInWithPopup, GoogleAuthProvider", "signInWithPopup, signInWithRedirect, GoogleAuthProvider")

old_login = """    try {
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
    }"""

new_login = """    try {
      const auth = getFirebaseInstance();
      if (!auth) {
        const { auth: asyncAuth } = await initFirebase();
        const provider = new GoogleAuthProvider();
        await signInWithPopup(asyncAuth, provider, browserPopupRedirectResolver);
        return;
      }
      
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    } catch (error: any) {
      console.error("Login error", error);
      
      // Se o popup foi bloqueado pelo navegador, tenta fazer o login por redirecionamento
      if (error.code === 'auth/popup-blocked' || error.message?.toLowerCase().includes('popup')) {
        try {
          const auth = getFirebaseInstance();
          if (auth) {
            const provider = new GoogleAuthProvider();
            await signInWithRedirect(auth, provider);
          }
        } catch (redirectError) {
          console.error("Redirect login error", redirectError);
          alert("Falha no login. Verifique as configurações de segurança do seu navegador e tente novamente.");
        }
      } else if (error.code === 'auth/popup-closed-by-user') {
        // Usuário fechou a janela, não faz nada
      } else {
        alert("Falha ao abrir a janela de login. Se você estiver usando Safari ou bloqueadores de pop-up, tente permitir pop-ups para esta página ou clique no botão de 'Device' ou 'Remix' no canto superior direito para abrir o app em uma nova guia.");
      }
    }"""

code = code.replace(old_login, new_login)

with open("src/App.tsx", "w") as f:
    f.write(code)

