with open("src/components/Lobby.tsx", "r") as f:
    content = f.read()

import_block = """import { collection, doc, getDocs, setDoc, deleteDoc, runTransaction, onSnapshot, query, orderBy, limit, where, addDoc } from 'firebase/firestore';"""
content = content.replace("import { collection, doc, getDocs, setDoc, deleteDoc, runTransaction, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore';", import_block)

state_block = """  const [hasSavedBotGame, setHasSavedBotGame] = useState(false);
  const [timeControl, setTimeControl] = useState<number>(300); // 5 min default
  const [challengingUserId, setChallengingUserId] = useState<string | null>(null);

  const handleDirectInvite = async (user: UserData) => {
    if (!currentUser) {
      onLoginRequest?.();
      return;
    }
    try {
      setChallengingUserId(user.uid);
      const db = getDb();
      await addDoc(collection(db, 'challenges'), {
        challengerId: currentUser.uid,
        challengedId: user.uid,
        challengerName: currentUser.displayName || 'Jogador',
        challengerElo: currentUser.elo || 1200,
        status: 'pending',
        createdAt: Date.now()
      });
      setTimeout(() => setChallengingUserId(null), 2000);
    } catch(e) {
      console.error("Error challenging user:", e);
      setChallengingUserId(null);
      alert("Falha ao enviar convite.");
    }
  };"""

content = content.replace("""  const [hasSavedBotGame, setHasSavedBotGame] = useState(false);
  const [timeControl, setTimeControl] = useState<number>(300); // 5 min default""", state_block)

ui_block = """                    <div className="flex flex-col flex-1">
                      <span className="text-sm font-bold text-zinc-200">
                        {(user.displayName || 'Jogador').split(' ')[0]} {user.uid === currentUser?.uid && <span className="text-emerald-500/80 text-[10px] font-bold uppercase ml-1">(Você)</span>}
                      </span>
                      <span className="text-xs text-indigo-400 font-medium">{user.elo} ELO</span>
                    </div>
                    {user.uid !== currentUser?.uid && (
                      <button
                        onClick={() => handleDirectInvite(user)}
                        disabled={challengingUserId === user.uid}
                        className="ml-auto bg-zinc-800 hover:bg-emerald-600 text-white p-2 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
                        title="Convidar para Jogar"
                      >
                        {challengingUserId === user.uid ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
                      </button>
                    )}"""

content = content.replace("""                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-zinc-200">
                        {(user.displayName || 'Jogador').split(' ')[0]} {user.uid === currentUser?.uid && <span className="text-emerald-500/80 text-[10px] font-bold uppercase ml-1">(Você)</span>}
                      </span>
                      <span className="text-xs text-indigo-400 font-medium">{user.elo} ELO</span>
                    </div>""", ui_block)

with open("src/components/Lobby.tsx", "w") as f:
    f.write(content)
