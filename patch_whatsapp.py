import re

with open("src/components/Lobby.tsx", "r") as f:
    code = f.read()

# Add MessageCircle to imports
code = code.replace(
    "import { Loader2, Swords, Bot, ChevronDown, ChevronUp, Link as LinkIcon, Copy, Target, CheckCircle2, X, Users } from 'lucide-react';",
    "import { Loader2, Swords, Bot, ChevronDown, ChevronUp, Link as LinkIcon, Copy, Target, CheckCircle2, X, Users, MessageCircle } from 'lucide-react';"
)

# Insert WhatsApp button
old_block = """                  <div className="flex w-full items-center gap-2 bg-zinc-950 rounded-xl p-2 border border-indigo-500/20">
                    <code className="text-xs text-zinc-400 truncate flex-1 pl-2">{inviteLink}</code>
                    <button 
                      onClick={() => navigator.clipboard.writeText(inviteLink)}
                      className="p-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors text-white"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>"""

new_block = """                  <div className="flex w-full items-center gap-2 bg-zinc-950 rounded-xl p-2 border border-indigo-500/20">
                    <code className="text-xs text-zinc-400 truncate flex-1 pl-2">{inviteLink}</code>
                    <button 
                      onClick={() => navigator.clipboard.writeText(inviteLink)}
                      className="p-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors text-white"
                      title="Copiar link"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Vem jogar xadrez comigo no Vanguard Chess! Clique no link para entrar na partida: ${inviteLink}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-[#25D366] hover:bg-[#20bd5a] rounded-lg transition-colors text-white flex items-center justify-center"
                      title="Enviar pelo WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  </div>"""

code = code.replace(old_block, new_block)

with open("src/components/Lobby.tsx", "w") as f:
    f.write(code)

