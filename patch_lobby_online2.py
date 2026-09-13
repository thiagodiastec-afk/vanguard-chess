import re

with open("src/components/Lobby.tsx", "r") as f:
    code = f.read()

# Make sure UserCircle is imported
if "UserCircle" not in code:
    code = code.replace("import { Loader2, Swords", "import { Loader2, Swords, UserCircle")

# Add state if it's not there
if "const [onlineUsers" not in code:
    state_block = """  const [liveGames, setLiveGames] = useState<GameData[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<UserData[]>([]);"""
    code = re.sub(r'  const \[liveGames, setLiveGames\] = useState<GameData\[\]>\(\[\]\);', state_block, code)

# Add effect if not there
if "where('isOnline', '==', true)," not in code:
    effect_block = """  useEffect(() => {
    const db = getDb();
    const usersQuery = query(
      collection(db, 'users'),
      where('isOnline', '==', true),
      orderBy('lastSeen', 'desc'),
      limit(50)
    );
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const users: UserData[] = [];
      snapshot.forEach(doc => {
        const data = doc.data() as UserData;
        users.push(data);
      });
      setOnlineUsers(users);
    });
    return unsubscribeUsers;
  }, []);

  useEffect(() => {
    const db = getDb();
"""
    code = code.replace("  useEffect(() => {\n    const db = getDb();\n    const gamesQuery = query(", effect_block + "    const gamesQuery = query(")

# Replace Live Games Widget with new Layout
if "Online Agora" not in code:
    start_idx = code.find('{/* Live Games Widget */}')
    if start_idx != -1:
        end_idx = code.find('      {/* Bot Menu Modal */}', start_idx)
        if end_idx != -1:
            old_widget = code[start_idx:end_idx]
            
            new_widget = """        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Games Widget */}
          <div className="lg:col-span-2 bg-zinc-900/50 rounded-[2rem] p-6 sm:p-8 border border-zinc-800/50 flex flex-col min-h-[300px]">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.6)]" />
              TV Xadrez Ao Vivo
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
              {liveGames.length === 0 ? (
                <div className="col-span-1 sm:col-span-2 text-center py-12 border border-zinc-800/50 border-dashed rounded-2xl bg-zinc-900/50 flex items-center justify-center">
                  <p className="text-zinc-500 text-sm font-medium">Nenhuma partida ao vivo no momento</p>
                </div>
              ) : (
                liveGames.map(game => (
                  <div key={game.id} className="bg-zinc-950 rounded-2xl p-4 border border-zinc-800/80 flex flex-col gap-4 hover:border-emerald-500/30 transition-colors group">
                    <div className="flex justify-between items-center text-sm font-medium">
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-3 h-3 bg-zinc-200 border border-zinc-400 rounded-sm shadow-sm flex-shrink-0" />
                        <span className="text-zinc-100 truncate">{game.whiteName}</span>
                        <span className="text-emerald-500/80 text-xs">({game.whiteElo})</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-sm font-medium">
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-3 h-3 bg-zinc-900 border border-zinc-700 rounded-sm shadow-sm flex-shrink-0" />
                        <span className="text-zinc-100 truncate">{game.blackName}</span>
                        <span className="text-emerald-500/80 text-xs">({game.blackElo})</span>
                      </div>
                    </div>
                    {onSpectate && (
                      <button 
                        onClick={() => onSpectate(game.id)}
                        className="mt-2 w-full bg-zinc-800 group-hover:bg-emerald-500 group-hover:text-zinc-950 text-zinc-300 font-bold py-2.5 rounded-xl transition-all"
                      >
                        Assistir
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Online Users Widget */}
          <div className="lg:col-span-1 bg-zinc-900/50 rounded-[2rem] p-6 sm:p-8 border border-zinc-800/50 flex flex-col min-h-[300px] max-h-[600px]">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              Online Agora
              <span className="ml-auto text-xs font-bold text-zinc-400 bg-zinc-800 px-2.5 py-1 rounded-full">{onlineUsers.length}</span>
            </h3>

            <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
              {onlineUsers.length === 0 ? (
                <div className="text-center py-12 border border-zinc-800/50 border-dashed rounded-2xl bg-zinc-900/50">
                  <p className="text-zinc-500 text-sm">Apenas você no momento</p>
                </div>
              ) : (
                onlineUsers.map(user => (
                  <div key={user.uid} className="flex items-center gap-3 p-3 bg-zinc-950/50 border border-zinc-800/50 rounded-xl">
                    <div className="relative">
                      <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 font-bold text-sm">
                        {user.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-zinc-950 rounded-full" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-zinc-200">
                        {user.displayName.split(' ')[0]} {user.uid === currentUser?.uid && <span className="text-emerald-500/80 text-[10px] font-bold uppercase ml-1">(Você)</span>}
                      </span>
                      <span className="text-xs text-indigo-400 font-medium">{user.elo} ELO</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
"""
            
            code = code[:start_idx] + new_widget + "\n" + code[end_idx:]


with open("src/components/Lobby.tsx", "w") as f:
    f.write(code)

