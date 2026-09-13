import re

with open("src/components/Lobby.tsx", "r") as f:
    code = f.read()

# Add UserCircle to imports if needed, but let's just use CheckCircle2 or something existing, or import it.
if "UserCircle" not in code:
    code = code.replace("import { Loader2, Swords", "import { Loader2, Swords, UserCircle")

# Add state for online users
state_block = """  const [liveGames, setLiveGames] = useState<GameData[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<UserData[]>([]);"""
code = re.sub(r'  const \[liveGames, setLiveGames\] = useState<GameData\[\]>\(\[\]\);', state_block, code)

# Add effect to fetch online users
effect_block = """  useEffect(() => {
    const db = getDb();
    
    // Listen to online users
    const usersQuery = query(
      collection(db, 'users'),
      where('isOnline', '==', true),
      orderBy('lastSeen', 'desc'),
      limit(20)
    );
    
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const users: UserData[] = [];
      snapshot.forEach(doc => {
        const data = doc.data() as UserData;
        if (data.uid !== currentUser?.uid) { // Optional: exclude self, or keep it. Let's keep it but mark it.
           users.push(data);
        }
      });
      setOnlineUsers(users);
    });
    
    return unsubscribeUsers;
  }, [currentUser]);

  useEffect(() => {
    const db = getDb();
"""

code = code.replace("  useEffect(() => {\n    const db = getDb();\n    const gamesQuery = query(", effect_block + "    const gamesQuery = query(")

# In the render, add the online users panel. Let's put it on the side or below the games.
# First let's find the live games section.

old_games_panel = """      {/* Jogos ao Vivo */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">"""

new_games_panel = """      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Jogos ao Vivo (2 colunas) */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <Target className="w-6 h-6 text-emerald-500" />
            <h2 className="text-xl font-bold text-white">Partidas ao Vivo</h2>
            <div className="ml-auto flex items-center gap-2">
              <span className="flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs text-zinc-400 font-medium uppercase tracking-wider">{liveGames.length} Online</span>
            </div>
          </div>
          
          <div className="space-y-3">
            {liveGames.length === 0 ? (
              <div className="text-center py-12 border border-zinc-800/50 border-dashed rounded-2xl bg-zinc-900/50">
                <p className="text-zinc-500 text-sm">Nenhuma partida acontecendo agora</p>
              </div>
            ) : (
              liveGames.map(game => (
                <div key={game.id} onClick={() => onSpectate?.(game.id)} className="group flex items-center justify-between p-4 bg-zinc-950/50 hover:bg-zinc-800 border border-zinc-800/50 hover:border-zinc-700 rounded-2xl cursor-pointer transition-all">
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                        <span className="text-sm font-bold text-zinc-300">{game.whiteName}</span>
                        <span className="text-xs text-zinc-600 font-medium">({game.whiteElo})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-zinc-600 shadow-[0_0_8px_rgba(0,0,0,0.5)]" />
                        <span className="text-sm font-bold text-zinc-300">{game.blackName || 'Desconhecido'}</span>
                        <span className="text-xs text-zinc-600 font-medium">({game.blackElo})</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-bold text-emerald-500 group-hover:text-emerald-400 transition-colors uppercase tracking-wider">Assistir</span>
                    <span className="text-[10px] text-zinc-500 font-medium">{game.timeControl / 60} min</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Usuários Online (1 coluna) */}
        <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 flex flex-col max-h-[600px]">
          <div className="flex items-center gap-3 mb-6">
            <UserCircle className="w-6 h-6 text-indigo-500" />
            <h2 className="text-xl font-bold text-white">Online Agora</h2>
            <div className="ml-auto flex items-center gap-2">
              <span className="flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              <span className="text-xs text-zinc-400 font-medium uppercase tracking-wider">{onlineUsers.length}</span>
            </div>
          </div>
          
          <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
            {onlineUsers.length === 0 ? (
              <div className="text-center py-12 border border-zinc-800/50 border-dashed rounded-2xl bg-zinc-900/50">
                <p className="text-zinc-500 text-sm">Apenas você no momento</p>
              </div>
            ) : (
              onlineUsers.map(user => (
                <div key={user.uid} className="flex items-center justify-between p-3 bg-zinc-950/50 border border-zinc-800/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 font-bold text-sm">
                        {user.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-zinc-950 rounded-full" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-zinc-200">
                        {user.displayName} {user.uid === currentUser?.uid && <span className="text-zinc-500 text-xs font-normal">(Você)</span>}
                      </span>
                      <span className="text-xs text-indigo-400 font-medium">{user.elo} ELO</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>"""

# Find the start and end of the old Jogos ao Vivo block.
start_idx = code.find('{/* Jogos ao Vivo */}')
if start_idx != -1:
    end_idx = code.find('      {/* Bot Menu Modal */}', start_idx)
    if end_idx != -1:
        code = code[:start_idx] + new_games_panel + "\n\n" + code[end_idx:]


with open("src/components/Lobby.tsx", "w") as f:
    f.write(code)

