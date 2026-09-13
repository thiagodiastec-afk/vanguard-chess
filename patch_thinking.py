import re

with open("src/components/ComputerGame.tsx", "r") as f:
    code = f.read()

# I see a subtle issue. When we pass `game` to `makeComputerMove` as a dependency, the worker closure captures that `game`.
# But `isThinking` is also a dependency of the useEffect that calls `makeComputerMove`.
# If `isThinking` gets stuck on `true` for some reason, the computer will never make a move.
# Why would it get stuck on `true`?
# Maybe `WorkerModule.default()` throws an error?
# Or maybe the worker sends an error message and not `bestMove`?
# Let's add an `onerror` handler to the worker and set `setIsThinking(false)` if it fails.

# Actually, the previous patch added:
#             if (currentGame.fen() !== game.fen()) {
#               return currentGame;
#             }
# inside `setGame`. But wait!
# If `game` is a dependency of `makeComputerMove`, `game.fen()` is captured.
# What if the worker crashes?
# Let's add an error handler.

old = """        worker.terminate();
      };
      worker.postMessage({ type: 'search', fen: game.fen(), difficulty: activeDifficulty });
    });"""

new = """        worker.terminate();
      };
      worker.onerror = (err) => {
        console.error('Worker error:', err);
        setIsThinking(false);
        worker.terminate();
      };
      worker.postMessage({ type: 'search', fen: game.fen(), difficulty: activeDifficulty });
    }).catch(err => {
      console.error('Worker import error:', err);
      setIsThinking(false);
    });"""

code = code.replace(old, new)

with open("src/components/ComputerGame.tsx", "w") as f:
    f.write(code)

