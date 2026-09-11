import re

with open("src/components/ComputerGame.tsx", "r") as f:
    code = f.read()

# 1. Add CapturedPieces import
if "import CapturedPieces" not in code:
    code = code.replace("import MoveHistory from './MoveHistory';", "import MoveHistory from './MoveHistory';\nimport CapturedPieces from './CapturedPieces';")

# 2. Make sidebar narrower
code = code.replace('xl:w-[350px]', 'xl:w-[260px]')
code = code.replace('h-[250px] xl:h-[350px]', 'h-[250px] xl:h-[300px]')

# 3. Add CapturedPieces to the user blocks
# User block (Você)
old_user = """          <div className="flex items-center gap-4">
            <div className="w-4 h-4 rounded-full border-2 bg-white border-neutral-300" />
            <div>
              <h3 className="font-bold text-white text-lg">{currentUser?.displayName || 'Você'}</h3>
              {currentUser && <p className="text-sm text-neutral-400">{currentUser.elo} Rating</p>}
              
            </div>
          </div>"""

new_user = """          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4">
              <div className="w-4 h-4 rounded-full border-2 bg-white border-neutral-300" />
              <div>
                <h3 className="font-bold text-white text-base">{currentUser?.displayName || 'Você'}</h3>
                {currentUser && <p className="text-xs text-neutral-400">{currentUser.elo} Rating</p>}
              </div>
            </div>
            <CapturedPieces fen={game.fen()} color="w" />
          </div>"""

# Bot block
old_bot = """          <div className="flex items-center gap-4">
            <div className="w-4 h-4 rounded-full border-2 bg-black border-neutral-600" />
            <div>
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-white text-lg">Computador</h3>
              </div>
              <p className="text-sm text-neutral-400">Dificuldade: {getDifficultyName()}</p>
              
            </div>
            {isThinking && (
              <div className="ml-auto text-xs text-emerald-500 animate-pulse">Pensando...</div>
            )}
          </div>"""

new_bot = """          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4">
              <div className="w-4 h-4 rounded-full border-2 bg-black border-neutral-600" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <h3 className="font-bold text-white text-base truncate">Computador</h3>
                </div>
                <p className="text-xs text-neutral-400 truncate">Dificuldade: {getDifficultyName()}</p>
              </div>
              {isThinking && (
                <div className="ml-auto text-xs text-emerald-500 animate-pulse flex-shrink-0">...</div>
              )}
            </div>
            <CapturedPieces fen={game.fen()} color="b" />
          </div>"""

code = code.replace(old_user, new_user)
code = code.replace(old_bot, new_bot)

# Let's also adjust the MoveHistory paddings and font size if needed for a 260px wide container
# Actually MoveHistory is its own component. Let's patch MoveHistory.tsx to fit better.

with open("src/components/ComputerGame.tsx", "w") as f:
    f.write(code)

