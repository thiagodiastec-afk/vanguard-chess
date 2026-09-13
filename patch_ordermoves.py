import re

with open("src/lib/engine.ts", "r") as f:
    code = f.read()

# I see what happened. I added `moves = orderMoves(moves, game);` inside `calculateBestMove`,
# but the `orderMoves` function was only injected inside `minimax` by replacing the `minimax` function block, OR it was entirely missed if the regex didn't match.

# Wait, the `orderMoves` function might not have been declared at the top scope.
# Let's inject `orderMoves` at the top level of `engine.ts` if it's missing, or move it if it's nested.

order_moves_code = """
export function orderMoves(moves: string[], game: Chess): string[] {
  return moves.sort((a, b) => {
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
"""

if "export function orderMoves" not in code:
    # First, let's remove any nested `function orderMoves` to avoid conflicts
    code = re.sub(r'// Optimize move ordering[^\}]+return scoreB - scoreA;\n  }\);\n}', '', code)
    code = re.sub(r'function orderMoves\([^}]+\) \{[^}]+\}\)\;\n\}', '', code)

    # Now inject it before `calculateBestMove`
    code = code.replace("export function calculateBestMove", order_moves_code + "\nexport function calculateBestMove")

with open("src/lib/engine.ts", "w") as f:
    f.write(code)

