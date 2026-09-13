import re

with open("src/App.tsx", "r") as f:
    code = f.read()

# Add import
code = code.replace("import About from './components/About';", "import About from './components/About';\nimport NicknameModal from './components/NicknameModal';")

# Modify unsubscribeUser to create document if not exists
old_user_snap = """          const unsubscribeUser = onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
              const data = doc.data() as UserData;
              setUserData(data);
              
              if (data.activeTheme && data.activeTheme !== themeManager.getTheme().id) {
                themeManager.setTheme(data.activeTheme);
              }
              if (data.activeBackground && data.activeBackground !== backgroundManager.getBackground().id) {
                backgroundManager.setBackground(data.activeBackground);
              }
            }
          });"""

new_user_snap = """          const unsubscribeUser = onSnapshot(userRef, async (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as UserData;
              setUserData(data);
              
              if (data.activeTheme && data.activeTheme !== themeManager.getTheme().id) {
                themeManager.setTheme(data.activeTheme);
              }
              if (data.activeBackground && data.activeBackground !== backgroundManager.getBackground().id) {
                backgroundManager.setBackground(data.activeBackground);
              }
            } else {
              // Create user if not exists
              const initialData: UserData = {
                uid: firebaseUser.uid,
                displayName: firebaseUser.displayName || 'Jogador',
                hasSetNickname: false,
                elo: 1000,
                gamesPlayed: 0,
                coins: 100
              };
              try {
                await setDoc(userRef, initialData);
              } catch (e) {
                console.error("Error creating user document", e);
              }
            }
          });"""

code = code.replace(old_user_snap, new_user_snap)

# Inject NicknameModal near the top of the main layout, but only if user logged in
modal_injection = """  return (
    <div className="min-h-screen flex flex-col bg-neutral-900 text-neutral-100 font-sans">
      {userData && !userData.hasSetNickname && <NicknameModal currentUser={userData} />}"""

code = code.replace("""  return (
    <div className="min-h-screen flex flex-col bg-neutral-900 text-neutral-100 font-sans">""", modal_injection)

with open("src/App.tsx", "w") as f:
    f.write(code)

