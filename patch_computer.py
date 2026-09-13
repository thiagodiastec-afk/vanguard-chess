import re

with open("src/components/ComputerGame.tsx", "r") as f:
    code = f.read()

# Currently the worker is receiving a message and then creating a new game from the current `game.pgn()`:
# const gameCopy = new Chess();
# gameCopy.loadPgn(game.pgn());
# gameCopy.move(bestMove);
# setGame(gameCopy);
#
# But `game.pgn()` is captured from the closure of `makeComputerMove`. Wait! `game` is captured from the closure when `makeComputerMove` is called.
# BUT wait! `setGame` is using the closure `game`.
# We should use `setGame((currentGame) => { ... })` and verify that the FENs match before making the move.

old_worker = """        const { bestMove } = e.data;
        if (bestMove) {
          const gameCopy = new Chess();
          gameCopy.loadPgn(game.pgn());
          gameCopy.move(bestMove);
          setGame(gameCopy);
        }
        setIsThinking(false);
        worker.terminate();"""

new_worker = """        const { bestMove } = e.data;
        if (bestMove) {
          setGame((currentGame) => {
             // If the current game fen doesn't match the fen we sent to the worker, it means the user undid a move while the computer was thinking!
             if (currentGame.fen() !== game.fen()) {
               return currentGame;
             }
             const gameCopy = new Chess();
             gameCopy.loadPgn(currentGame.pgn());
             gameCopy.move(bestMove);
             return gameCopy;
          });
        }
        setIsThinking(false);
        worker.terminate();"""

code = code.replace(old_worker, new_worker)

with open("src/components/ComputerGame.tsx", "w") as f:
    f.write(code)

