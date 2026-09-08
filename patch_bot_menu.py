with open("src/components/Lobby.tsx", "r") as f:
    code = f.read()

import re

old_menu = """      {/* Bot Menu Modal */}
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
      )}"""

new_menu = """      {/* Bot Menu Modal */}
      {showBotMenu && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-in fade-in" onClick={() => setShowBotMenu(false)}>
          <div className="bg-zinc-900 rounded-[2rem] p-6 w-full max-w-sm border border-zinc-800 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowBotMenu(false)} className="absolute top-5 right-5 text-zinc-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Bot className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white leading-tight">Treinar com IA</h2>
                <p className="text-zinc-400 text-xs">Escolha o nível do motor</p>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              {hasSavedBotGame && (
                <button
                  onClick={() => { setShowBotMenu(false); onPlayComputer('resume'); }}
                  className="flex items-center justify-between px-4 py-3.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 transition-all rounded-xl border border-amber-500/30 active:scale-95 mb-2 group"
                >
                  <span className="font-bold text-sm">Retomar Partida</span>
                  <span className="text-[10px] uppercase tracking-wider font-black opacity-80 group-hover:opacity-100 transition-opacity">Continuar</span>
                </button>
              )}
              
              {difficulties.map(diff => (
                <button
                  key={diff.id}
                  onClick={() => { setShowBotMenu(false); onPlayComputer(diff.id); }}
                  className="flex items-center justify-between px-4 py-3.5 bg-zinc-950 hover:bg-zinc-800 transition-all rounded-xl border border-zinc-800 active:scale-95 group"
                >
                  <span className="font-bold text-sm text-zinc-300 group-hover:text-white transition-colors">
                    {diff.name.split(' (')[0]}
                  </span>
                  <span className={cn("text-[10px] font-black uppercase tracking-wider", diff.color)}>
                    {diff.name.includes('(') ? diff.name.split('(')[1].replace(')', '') : 'Nível Especial'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}"""

code = code.replace(old_menu, new_menu)

with open("src/components/Lobby.tsx", "w") as f:
    f.write(code)
