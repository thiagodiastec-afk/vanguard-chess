import re

with open("src/components/Game.tsx", "r") as f:
    code = f.read()

# Opponent / Top block
old_top = """          <div className="flex items-center gap-4">
            <div className={cn(
              "w-4 h-4 rounded-full border-2",
              isWhite ? "bg-black border-neutral-600" : "bg-white border-neutral-300"
            )} />
            <div>
              <h3 className="font-bold text-lg text-white">{opponentName} {topLabel}</h3>
              <p className="text-sm text-emerald-400 font-medium">{opponentElo} Elo</p>
              
            </div>
          </div>"""

new_top = """          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-4 h-4 rounded-full border-2",
                isWhite ? "bg-black border-neutral-600" : "bg-white border-neutral-300"
              )} />
              <div>
                <h3 className="font-bold text-base text-white">{opponentName} {topLabel}</h3>
                <p className="text-xs text-emerald-400 font-medium">{opponentElo} Elo</p>
              </div>
            </div>
            <CapturedPieces fen={gameInstance.fen()} color={isWhite ? 'b' : 'w'} />
          </div>"""

# User / Bottom block
old_bottom = """          <div className="flex items-center gap-4 mb-2">
            <div className={cn(
              "w-4 h-4 rounded-full border-2",
              isWhite ? "bg-white border-neutral-300" : "bg-black border-neutral-600"
            )} />
            <div>
              <h3 className="font-bold text-lg text-white">{bottomName} {bottomLabel}</h3>
              <p className="text-sm text-emerald-400 font-medium">{bottomElo} Elo</p>
              
            </div>
          </div>"""

new_bottom = """          <div className="flex flex-col gap-2 mb-2">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-4 h-4 rounded-full border-2",
                isWhite ? "bg-white border-neutral-300" : "bg-black border-neutral-600"
              )} />
              <div>
                <h3 className="font-bold text-base text-white">{bottomName} {bottomLabel}</h3>
                <p className="text-xs text-emerald-400 font-medium">{bottomElo} Elo</p>
              </div>
            </div>
            <CapturedPieces fen={gameInstance.fen()} color={isWhite ? 'w' : 'b'} />
          </div>"""

code = code.replace(old_top, new_top)
code = code.replace(old_bottom, new_bottom)

with open("src/components/Game.tsx", "w") as f:
    f.write(code)

