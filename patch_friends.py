import re

with open("src/components/Friends.tsx", "r") as f:
    code = f.read()

# Add Share2 or MessageCircle icon import
code = code.replace("import { Search, UserPlus, UserMinus, Swords, Circle, Loader2 } from 'lucide-react';", 
                    "import { Search, UserPlus, UserMinus, Swords, Circle, Loader2, MessageCircle } from 'lucide-react';")

# Add a section for WhatsApp Invite
invite_section = """        )}
      </div>

      <div className="bg-emerald-900/30 rounded-2xl p-6 border border-emerald-500/30 shadow-xl flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Convide seus amigos</h2>
          <p className="text-emerald-400/80 text-sm">Traga mais pessoas para jogar com você no Vanguard Chess!</p>
        </div>
        <button
          onClick={() => {
            const text = encodeURIComponent(`Venha jogar xadrez comigo no Vanguard Chess! Adicione meu nick: ${currentUser.displayName}\\n\\nAcesse: ${window.location.origin}`);
            window.open(`https://wa.me/?text=${text}`, '_blank');
          }}
          className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-xl transition-colors flex items-center gap-2"
        >
          <MessageCircle className="w-5 h-5" />
          Convidar via WhatsApp
        </button>
      </div>

      <div className="bg-neutral-800 rounded-2xl p-6 border border-neutral-700/50 shadow-xl flex-1">"""

code = code.replace("""        )}
      </div>
      <div className="bg-neutral-800 rounded-2xl p-6 border border-neutral-700/50 shadow-xl flex-1">""", invite_section)

with open("src/components/Friends.tsx", "w") as f:
    f.write(code)

