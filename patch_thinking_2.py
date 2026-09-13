import re

with open("src/components/ComputerGame.tsx", "r") as f:
    code = f.read()

# Let's also check onDrop. Does it return true/false properly?
# If the user makes a move, game state updates.
# useEffect sees `game.turn() !== playerColor` and calls `makeComputerMove()`.
# `makeComputerMove` sets `isThinking` to true.
# What if it's checkmate? `game.isGameOver()` is true, so it returns early without setting `isThinking`. That's fine.

# BUT wait! We should verify if there's any state desync.
# If `game` changes in `onDrop`, it schedules a render.
# In the next render, `game.turn()` is black, `playerColor` is white, `!isThinking` is true.
# `useEffect` fires, calls `makeComputerMove()`.

# Let's look closely at `makeComputerMove` dependencies.
#   }, [game, activeDifficulty, playerColor, isThinking]);
# If `game` changes, `makeComputerMove` gets redefined.
# The useEffect:
#   useEffect(() => {
#     if (game.isGameOver() && !gameOver) {
#       ...
#     } else if (!gameOver && game.turn() !== playerColor && !isThinking) {
#       makeComputerMove();
#     }
#   }, [game, playerColor, isThinking, makeComputerMove, gameOver]);
#
# Looks perfectly correct!

# Why would it not make a move?
# Maybe `game.isGameOver()` is true? (Checkmate, stalemate)
# Maybe `game.turn() === playerColor`? (Somehow it thought it was white's turn)
# Maybe `isThinking` is stuck on `true`?

# Let's add a timeout fallback to isThinking. If it's thinking for more than 15 seconds, forcefully reset it so it can retry.

timeout_code = """
  // Fallback in case worker gets stuck
  useEffect(() => {
    let timeout: any;
    if (isThinking) {
      timeout = setTimeout(() => {
        console.warn("Worker timed out after 15s. Resetting isThinking.");
        setIsThinking(false);
      }, 15000);
    }
    return () => clearTimeout(timeout);
  }, [isThinking]);
"""

# Insert before return
code = code.replace("  const calculateEloChange = ", timeout_code + "\n  const calculateEloChange = ")

with open("src/components/ComputerGame.tsx", "w") as f:
    f.write(code)

