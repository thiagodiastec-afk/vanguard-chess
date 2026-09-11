import re

def update_game(filename):
    with open(filename, "r") as f:
        code = f.read()

    if "import CapturedPieces" not in code:
        code = code.replace("import MoveHistory from './MoveHistory';", "import MoveHistory from './MoveHistory';\nimport CapturedPieces from './CapturedPieces';")

    code = code.replace('xl:w-[350px]', 'xl:w-[260px]')
    code = code.replace('h-[250px] xl:h-[350px]', 'h-[250px] xl:h-[300px]')

    if "LocalGame.tsx" in filename:
        old_user1 = """          <div className="flex items-center gap-4">
            <div className="w-4 h-4 rounded-full border-2 bg-white border-neutral-300" />
            <div>
              <h3 className="font-bold text-white text-lg">Brancas</h3>
              <p className="text-sm text-neutral-400">Jogador 1</p>
            </div>
          </div>"""

        new_user1 = """          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4">
              <div className="w-4 h-4 rounded-full border-2 bg-white border-neutral-300" />
              <div>
                <h3 className="font-bold text-white text-base">Brancas</h3>
                <p className="text-xs text-neutral-400">Jogador 1</p>
              </div>
            </div>
            <CapturedPieces fen={game.fen()} color="w" />
          </div>"""

        old_user2 = """          <div className="flex items-center gap-4">
            <div className="w-4 h-4 rounded-full border-2 bg-black border-neutral-600" />
            <div>
              <h3 className="font-bold text-white text-lg">Pretas</h3>
              <p className="text-sm text-neutral-400">Jogador 2</p>
            </div>
          </div>"""

        new_user2 = """          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4">
              <div className="w-4 h-4 rounded-full border-2 bg-black border-neutral-600" />
              <div>
                <h3 className="font-bold text-white text-base">Pretas</h3>
                <p className="text-xs text-neutral-400">Jogador 2</p>
              </div>
            </div>
            <CapturedPieces fen={game.fen()} color="b" />
          </div>"""

        code = code.replace(old_user1, new_user1)
        code = code.replace(old_user2, new_user2)

    elif "Game.tsx" in filename:
        old_user = """          <div className="flex items-center gap-4">
            <div className="w-4 h-4 rounded-full border-2 bg-white border-neutral-300" />
            <div>
              <h3 className="font-bold text-white text-lg">{currentUser?.displayName || 'Você'}</h3>
              <p className="text-sm text-neutral-400">{currentUser?.elo || 1200} Rating</p>
            </div>
          </div>"""

        new_user = """          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4">
              <div className="w-4 h-4 rounded-full border-2 bg-white border-neutral-300" />
              <div>
                <h3 className="font-bold text-white text-base">{currentUser?.displayName || 'Você'}</h3>
                <p className="text-xs text-neutral-400">{currentUser?.elo || 1200} Rating</p>
              </div>
            </div>
            <CapturedPieces fen={game.fen()} color="w" />
          </div>"""

        old_opponent = """          <div className="flex items-center gap-4">
            <div className="w-4 h-4 rounded-full border-2 bg-black border-neutral-600" />
            <div>
              <h3 className="font-bold text-white text-lg">Oponente</h3>
              <p className="text-sm text-neutral-400">Procurando...</p>
            </div>
          </div>"""

        new_opponent = """          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4">
              <div className="w-4 h-4 rounded-full border-2 bg-black border-neutral-600" />
              <div>
                <h3 className="font-bold text-white text-base">Oponente</h3>
                <p className="text-xs text-neutral-400">Procurando...</p>
              </div>
            </div>
            <CapturedPieces fen={game.fen()} color="b" />
          </div>"""

        code = code.replace(old_user, new_user)
        code = code.replace(old_opponent, new_opponent)

    with open(filename, "w") as f:
        f.write(code)

update_game("src/components/LocalGame.tsx")
update_game("src/components/Game.tsx")

