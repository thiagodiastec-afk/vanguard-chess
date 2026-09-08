import re

with open("src/components/Lobby.tsx", "r") as f:
    lobby_code = f.read()

start_idx = lobby_code.find("return (")

new_render = """return (
    <div className="w-full flex flex-col md:flex-row gap-6 lg:gap-8 max-w-[1400px] mx-auto">
      
      {/* Left Column - Main Actions (Bento Grid) */}
      <div className="flex-1 flex flex-col gap-6">
        
        {/* Play Now Hero Card */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 rounded-[2rem] p-6 sm:p-8 border border-zinc-800/50 shadow-2xl relative overflow-hidden group">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-colors duration-700" />
          
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">Jogar Xadrez</h2>
            <p className="text-zinc-400 mb-8 max-w-sm">Jogue contra milhões de jogadores do mundo inteiro ou desafie um amigo.</p>
            
            {isSearching ? (
              <div className="bg-zinc-950/50 border border-emerald-500/30 rounded-2xl p-6 flex flex-col items-center gap-4 animate-in fade-in zoom-in-95">
                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
                <div className="text-center">
                  <p className="font-bold text-lg text-emerald-400">Buscando oponente...</p>
                  <p className="text-sm text-zinc-400">Calculando ELO e pareamento</p>
                </div>
                <button
                  onClick={cancelSearch}
                  className="mt-2 w-full max-w-[200px] font-bold py-3 px-6 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-all active:scale-95"
                >
                  Cancelar Busca
                </button>
              </div>
            ) : inviteLink ? (
              <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-6 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-top-4">
                <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center">
                  <LinkIcon className="w-6 h-6 text-indigo-400" />
                </div>
                <div className="text-center w-full">
                  <p className="text-sm font-bold text-indigo-300 mb-2">Envie este link para seu amigo</p>
                  <div className="flex w-full items-center gap-2 bg-zinc-950 rounded-xl p-2 border border-indigo-500/20">
                    <code className="text-xs text-zinc-400 truncate flex-1 pl-2">{inviteLink}</code>
                    <button 
                      onClick={() => navigator.clipboard.writeText(inviteLink)}
                      className="p-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors text-white"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <button
                  onClick={cancelInvite}
                  className="mt-2 w-full max-w-[200px] font-bold py-3 px-6 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-all active:scale-95"
                >
                  Cancelar Convite
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Partida Rápida</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Bullet', time: '1 min', val: 60, icon: '⚡' },
                      { label: 'Blitz', time: '3 min', val: 180, icon: '🔥' },
                      { label: 'Blitz', time: '5 min', val: 300, icon: '⏱️' },
                      { label: 'Rapid', time: '10 min', val: 600, icon: '🐢' }
                    ].map(tc => (
                      <button
                        key={tc.val}
                        onClick={() => { setTimeControl(tc.val); findMatch(); }}
                        className="bg-zinc-950/50 hover:bg-zinc-800 border border-zinc-800/80 hover:border-emerald-500/50 rounded-2xl p-4 flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95 group"
                      >
                        <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">{tc.icon}</span>
                        <span className="font-bold text-zinc-200">{tc.time}</span>
                        <span className="text-[10px] text-zinc-500 font-medium">{tc.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex flex-col justify-end gap-3 mt-4 sm:mt-0">
                  <button
                    onClick={createInvite}
                    className="w-full bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 font-bold py-4 px-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 group"
                  >
                    <Users className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    Jogar com Amigo
                  </button>
                  <button
                    onClick={() => setShowBotMenu(true)}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 px-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 group"
                  >
                    <Bot className="w-5 h-5 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                    Treinar com IA
                  </button>
                </div>
              </div>
            )}
            
            {error && (
              <div className="mt-6 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Live Games Widget */}
        {liveGames.length > 0 && (
          <div className="bg-zinc-900/50 rounded-[2rem] p-6 sm:p-8 border border-zinc-800/50">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.6)]" />
              TV Xadrez Ao Vivo
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {liveGames.map(game => (
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
                      Assistir Partida
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Right Column - Secondary Widgets */}
      <div className="w-full md:w-[320px] lg:w-[380px] flex flex-col gap-6 shrink-0">
        
        {/* Daily Missions */}
        <div className="bg-zinc-900/50 rounded-[2rem] p-6 border border-zinc-800/50 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl" />
          <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-500" />
            Missões Diárias
          </h3>
          
          <div className="space-y-4">
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80">
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-zinc-100 text-sm">Defesa de Ferro</span>
                <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg">+50 XP</span>
              </div>
              <p className="text-xs text-zinc-500 mb-4 font-medium">Vença 1 partida jogando com as peças Pretas.</p>
              <div>
                <div className="w-full bg-zinc-900 rounded-full h-1.5 mb-1.5 overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full w-0 transition-all duration-1000" />
                </div>
                <p className="text-right text-[10px] font-bold text-zinc-500">0 / 1</p>
              </div>
            </div>
            
            <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/20">
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-emerald-400 text-sm line-through opacity-70">Mestre Tático</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-xs text-emerald-500/50 mb-4 font-medium line-through">Faça um Roque em 3 jogos.</p>
              <div>
                <div className="w-full bg-emerald-950 rounded-full h-1.5 mb-1.5 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full w-full" />
                </div>
                <p className="text-right text-[10px] font-bold text-emerald-500">3 / 3</p>
              </div>
            </div>
          </div>
        </div>

        {/* Local Play Widget */}
        <button
          onClick={() => onPlayLocal?.()}
          disabled={isSearching}
          className="bg-zinc-900 hover:bg-zinc-800 rounded-[2rem] p-6 border border-zinc-800/50 transition-all active:scale-[0.98] text-left group"
        >
          <div className="w-12 h-12 bg-zinc-800 group-hover:bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-4 transition-colors">
            <Users className="w-6 h-6 text-zinc-400 group-hover:text-indigo-400 transition-colors" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Pass & Play</h3>
          <p className="text-xs text-zinc-500 font-medium">Jogue localmente no mesmo dispositivo com um amigo lado a lado.</p>
        </button>

      </div>

      {/* Bot Menu Modal */}
      {showBotMenu && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-md animate-in fade-in" onClick={() => setShowBotMenu(false)}>
          <div className="bg-zinc-900 rounded-[2rem] p-8 w-full max-w-md border border-zinc-800 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowBotMenu(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white">
              <X className="w-6 h-6" />
            </button>
            <div className="w-16 h-16 bg-emerald-500/10 rounded-3xl flex items-center justify-center mb-6">
              <Bot className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Treinar com IA</h2>
            <p className="text-zinc-400 text-sm mb-8">Escolha a dificuldade do motor Stockfish.</p>
            
            <div className="grid grid-cols-2 gap-3">
              {hasSavedBotGame && (
                <button
                  onClick={() => { setShowBotMenu(false); onPlayComputer('resume'); }}
                  className="col-span-2 flex flex-col items-center justify-center px-4 py-4 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 transition-all rounded-2xl border border-amber-500/30 active:scale-95"
                >
                  <span className="font-bold text-lg mb-1">Retomar Partida</span>
                  <span className="text-xs opacity-80 font-medium">Continuar de onde parou</span>
                </button>
              )}
              {difficulties.map(diff => (
                <button
                  key={diff.id}
                  onClick={() => { setShowBotMenu(false); onPlayComputer(diff.id); }}
                  className={cn(
                    "flex flex-col px-4 py-5 bg-zinc-950 hover:bg-zinc-800 transition-all rounded-2xl border border-zinc-800 active:scale-95 text-left",
                    diff.id === 'profissional' || diff.id === 'iniciante' ? "col-span-2 items-center text-center" : "items-start"
                  )}
                >
                  <span className={cn("font-bold text-lg mb-1 text-zinc-200", diff.id === 'profissional' || diff.id === 'iniciante' ? "w-full" : "", diff.color)}>
                    {diff.name.split(' (')[0]}
                  </span>
                  <span className={cn("text-xs text-zinc-500 font-medium", diff.id === 'profissional' || diff.id === 'iniciante' ? "w-full" : "")}>
                    {diff.name.includes('(') ? diff.name.split('(')[1].replace(')', '') : 'Nível Especial'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}"""

lobby_code = lobby_code[:start_idx] + new_render

with open("src/components/Lobby.tsx", "w") as f:
    f.write(lobby_code)

