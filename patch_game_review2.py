import re
with open("src/components/Game.tsx", "r") as f:
    code = f.read()

button_html = """            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowReview(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition-all active:scale-95 flex items-center gap-2"
              >
                <BrainCircuit className="w-5 h-5" /> Game Review
              </button>
              <button
                onClick={onExit}
                className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold py-3 px-6 rounded-xl transition-all active:scale-95"
              >
                Voltar ao Início
              </button>
            </div>"""

code = code.replace("""            </p>
            <button
              onClick={onExit}
              className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold py-3 px-6 rounded-xl transition-all active:scale-95"
            >
              Voltar ao Início
            </button>""", button_html)

modal_html = """      </div>
      
      {showReview && (
        <GameReview 
          pgn={game.pgn} 
          playerWhiteName={game.whiteName}
          playerBlackName={game.blackName}
          onClose={() => setShowReview(false)} 
        />
      )}
    </div>
  );
}"""

if "{showReview &&" not in code:
    code = re.sub(r'      </div>\n    </div>\n  \);\n\}', modal_html, code)

if "BrainCircuit" not in code:
    code = code.replace("import { MessageSquare, Users, ChevronLeft, Flag } from 'lucide-react';", "import { MessageSquare, Users, ChevronLeft, Flag, BrainCircuit } from 'lucide-react';")

with open("src/components/Game.tsx", "w") as f:
    f.write(code)

