import re
with open("src/components/Game.tsx", "r") as f:
    code = f.read()

target = """        let newStatus: GameData['status'] = game.status;
        if (chess.isCheckmate()) {
          newStatus = isWhite ? 'white_won' : 'black_won';
        } else if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition()) {
          newStatus = 'draw';
        }

        updateDoc(gameRef, {
          fen: chess.fen(),
          pgn: chess.pgn(),
          turn: chess.turn(),
          lastMoveAt: Date.now(),
          status: newStatus
        }).then(() => {"""

replacement = """        let newStatus: GameData['status'] = game.status;
        if (chess.isCheckmate()) {
          newStatus = isWhite ? 'white_won' : 'black_won';
        } else if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition()) {
          newStatus = 'draw';
        }

        const timeSpent = (Date.now() - game.lastMoveAt) / 1000;
        let newWhiteTime = game.whiteTime ?? game.timeControl ?? 0;
        let newBlackTime = game.blackTime ?? game.timeControl ?? 0;

        if (game.timeControl) {
          if (chess.turn() === 'b') {
            newWhiteTime = Math.max(0, newWhiteTime - timeSpent);
          } else {
            newBlackTime = Math.max(0, newBlackTime - timeSpent);
          }
        }

        updateDoc(gameRef, {
          fen: chess.fen(),
          pgn: chess.pgn(),
          turn: chess.turn(),
          lastMoveAt: Date.now(),
          status: newStatus,
          whiteTime: newWhiteTime,
          blackTime: newBlackTime
        }).then(() => {"""

if target in code:
    code = code.replace(target, replacement)
    with open("src/components/Game.tsx", "w") as f:
        f.write(code)
    print("Patched successfully")
else:
    print("Target not found. Doing regex replace...")
    # fallback with regex spacing ignore
    target_regex = re.compile(r"let newStatus.*?updateDoc\([^}]+\}\)\.then\(\(\) => \{", re.DOTALL)
    if target_regex.search(code):
        code = target_regex.sub(replacement, code)
        with open("src/components/Game.tsx", "w") as f:
            f.write(code)
        print("Regex patched successfully")
    else:
        print("Failed to patch")
