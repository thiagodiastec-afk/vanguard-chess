with open("src/lib/chessPieces.tsx", "r") as f:
    code = f.read()

new_func = """export const getCustomPieces = (pieceSet: string = 'neo') => {
  if (pieceSet === 'default' || pieceSet === 'classic') return undefined;
  
  return pieceNames.reduce((acc, piece) => {
    acc[piece] = () => (
      <svg viewBox="0 0 150 150" width="100%" height="100%">
        <image href={`https://images.chesscomfiles.com/chess-themes/pieces/${pieceSet}/150/${piece.toLowerCase()}.png`} width="150" height="150" />
      </svg>
    );
    return acc;
  }, {} as Record<string, any>);
}"""

import re
code = re.sub(r"export const getCustomPieces =.*?}, {} as Record<string, any>\);", new_func, code, flags=re.DOTALL)

with open("src/lib/chessPieces.tsx", "w") as f:
    f.write(code)

