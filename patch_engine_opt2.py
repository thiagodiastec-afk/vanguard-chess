import re

with open("src/lib/engine.ts", "r") as f:
    code = f.read()

def replace_minimax(match):
    return """
// Optimize move ordering for Alpha-Beta pruning to be dramatically faster
function orderMoves(moves: string[], game: Chess): string[] {
  return moves.sort((a, b) => {
    // Very simple move ordering: 
    // 1. Captures (contains 'x')
    // 2. Checks (contains '+')
    // 3. Promotions (contains '=')
    let scoreA = 0;
    let scoreB = 0;
    
    if (a.includes('x')) scoreA += 10;
    if (a.includes('+')) scoreA += 5;
    if (a.includes('=')) scoreA += 8;
    
    if (b.includes('x')) scoreB += 10;
    if (b.includes('+')) scoreB += 5;
    if (b.includes('=')) scoreB += 8;
    
    return scoreB - scoreA;
  });
}

export function minimax(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizingPlayer: boolean
): number {
  if (depth === 0 || game.isGameOver()) {
    return evaluateBoard(game);
  }

  let moves = game.moves();
  // Apply move ordering to increase alpha-beta cutoffs
  moves = orderMoves(moves, game);

  if (isMaximizingPlayer) {
    let bestVal = -Infinity;
    for (let i = 0; i < moves.length; i++) {
      game.move(moves[i]);
      bestVal = Math.max(bestVal, minimax(game, depth - 1, alpha, beta, !isMaximizingPlayer));
      game.undo();
      alpha = Math.max(alpha, bestVal);
      if (beta <= alpha) {
        break;
      }
    }
    return bestVal;
  } else {
    let bestVal = Infinity;
    for (let i = 0; i < moves.length; i++) {
      game.move(moves[i]);
      bestVal = Math.min(bestVal, minimax(game, depth - 1, alpha, beta, !isMaximizingPlayer));
      game.undo();
      beta = Math.min(beta, bestVal);
      if (beta <= alpha) {
        break;
      }
    }
    return bestVal;
  }
}
"""

if "orderMoves" not in code:
    code = re.sub(r'export function minimax\([^}]+return bestVal;\n  }\n}', replace_minimax, code, flags=re.MULTILINE | re.DOTALL)

with open("src/lib/engine.ts", "w") as f:
    f.write(code)

