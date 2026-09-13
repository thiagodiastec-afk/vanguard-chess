with open("src/App.tsx", "r") as f:
    content = f.read()

invite_block = """          // Handle Invite Link
          try {
            const urlParams = new URLSearchParams(window.location.search);
            const inviteId = urlParams.get('invite');
            if (inviteId) {
               const gameRef = doc(db, 'games', inviteId);
               const gameSnap = await getDoc(gameRef);
               if (gameSnap.exists()) {
                 const gameData = gameSnap.data();
                 if (gameData.status === 'waiting_friend' && gameData.whiteId !== firebaseUser.uid) {
                   await updateDoc(gameRef, {
                     blackId: firebaseUser.uid,
                     blackName: firebaseUser.displayName || 'Amigo',
                     status: 'playing',
                     lastMoveTime: Date.now()
                   });
                 }
               }
               window.history.replaceState({}, document.title, window.location.pathname);
            }
          } catch (err) {
            console.error("Error processing invite link", err);
            window.history.replaceState({}, document.title, window.location.pathname);
          }"""

content = content.replace("""          // Handle Invite Link
          const urlParams = new URLSearchParams(window.location.search);
          const inviteId = urlParams.get('invite');
          if (inviteId) {
             const gameRef = doc(db, 'games', inviteId);
             const gameSnap = await getDoc(gameRef);
             if (gameSnap.exists()) {
               const gameData = gameSnap.data();
               if (gameData.status === 'waiting_friend' && gameData.whiteId !== firebaseUser.uid) {
                 await updateDoc(gameRef, {
                   blackId: firebaseUser.uid,
                   blackName: firebaseUser.displayName || 'Amigo',
                   status: 'playing',
                   lastMoveTime: Date.now()
                 });
               }
             }
             window.history.replaceState({}, document.title, window.location.pathname);
          }""", invite_block)

with open("src/App.tsx", "w") as f:
    f.write(content)
