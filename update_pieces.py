with open("src/lib/chessPieces.tsx", "r") as f:
    code = f.read()

code = code.replace("export const customPieces = pieceNames.reduce((acc, piece) => {", 
"export const getCustomPieces = (pieceSet: string = 'neo') => pieceNames.reduce((acc, piece) => {")

code = code.replace("`https://images.chesscomfiles.com/chess-themes/pieces/wood/150/${piece.toLowerCase()}.png`",
"`https://images.chesscomfiles.com/chess-themes/pieces/${pieceSet}/150/${piece.toLowerCase()}.png`")

code = code.replace("}, {} as Record<string, any>);", "}, {} as Record<string, any>);\n\nexport const customPieces = getCustomPieces('neo');")

with open("src/lib/chessPieces.tsx", "w") as f:
    f.write(code)
