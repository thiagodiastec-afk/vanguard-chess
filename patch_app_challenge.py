with open("src/App.tsx", "r") as f:
    content = f.read()

# Add accept/decline challenge functions inside App component
challenge_funcs = """
  const acceptChallenge = async () => {
    if (!incomingChallenge || !userData) return;
    try {
      const db = getDb();
      const newGameRef = doc(collection(db, 'games'));
      
      const newGame = {
        whiteId: incomingChallenge.challengerId,
        whiteName: incomingChallenge.challengerName,
        whiteElo: incomingChallenge.challengerElo,
        blackId: userData.uid,
        blackName: userData.displayName || 'Jogador',
        blackElo: userData.elo || 1200,
        status: 'playing',
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        pgn: '',
        turn: 'w',
        whiteThemeId: 'luxury',
        lastMoveAt: Date.now(),
        timeControl: 300,
        whiteTime: 300,
        blackTime: 300,
        spectatorsAllowedWhite: true,
        spectatorsAllowedBlack: true,
      };
      
      await setDoc(newGameRef, newGame);
      await updateDoc(doc(db, 'challenges', incomingChallenge.id), { 
        status: 'accepted',
        gameId: newGameRef.id 
      });
      setIncomingChallenge(null);
    } catch (e) {
      console.error(e);
    }
  };

  const declineChallenge = async () => {
    if (!incomingChallenge) return;
    try {
      const db = getDb();
      await updateDoc(doc(db, 'challenges', incomingChallenge.id), { status: 'declined' });
      setIncomingChallenge(null);
    } catch (e) {
      console.error(e);
    }
  };
"""

content = content.replace("  const currentTheme = useTheme();", challenge_funcs + "\n  const currentTheme = useTheme();")

# Add the UI modal at the end before </div>
challenge_ui = """
      {/* Challenge Modal */}
      {incomingChallenge && !activeGame && (
        <div className="fixed inset-0 z-[70] bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-zinc-900 rounded-3xl p-8 w-full max-w-sm border border-emerald-500/50 shadow-2xl relative text-center">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-emerald-500 animate-pulse">
              <Swords className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Desafio Recebido!</h2>
            <p className="text-zinc-400 mb-6">
              <span className="text-emerald-400 font-bold">{incomingChallenge.challengerName}</span> ({incomingChallenge.challengerElo} ELO) convidou você para uma partida.
            </p>
            <div className="flex gap-4">
              <button
                onClick={declineChallenge}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Recusar
              </button>
              <button
                onClick={acceptChallenge}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
              >
                Aceitar
              </button>
            </div>
          </div>
        </div>
      )}
"""

content = content.replace("      {/* Pix Modal */}", challenge_ui + "      {/* Pix Modal */}")

with open("src/App.tsx", "w") as f:
    f.write(content)
