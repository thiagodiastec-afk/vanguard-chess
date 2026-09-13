import re

with open("src/components/Lobby.tsx", "r") as f:
    code = f.read()

pass_and_play = """
      <div className="mt-8 mb-4">
        <button 
          onClick={onPlayLocal}
          className="w-full bg-zinc-900 border border-zinc-800 hover:border-indigo-500/30 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center transition-all group"
        >
          <div className="w-12 h-12 bg-zinc-800 group-hover:bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-4 transition-colors">
            <Users className="w-6 h-6 text-zinc-400 group-hover:text-indigo-400 transition-colors" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Pass & Play</h3>
          <p className="text-xs text-zinc-500 font-medium">Jogue localmente no mesmo dispositivo com um amigo lado a lado.</p>
        </button>
      </div>

"""

if "Pass & Play" not in code:
    code = code.replace("      {/* Bot Menu Modal */}", pass_and_play + "      {/* Bot Menu Modal */}")

with open("src/components/Lobby.tsx", "w") as f:
    f.write(code)

