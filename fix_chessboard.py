import re
with open("src/components/GameReview.tsx", "r") as f:
    code = f.read()

replacement = """            {/* @ts-ignore */}
            <Chessboard 
              options={{
                position: chess.fen(),
                boardOrientation: "white",
                darkSquareStyle: theme.darkSquareStyle,
                lightSquareStyle: theme.lightSquareStyle,
                pieces: customPieces,
                arePiecesDraggable: false
              }}
            />"""

code = re.sub(r'\{\/\* @ts-ignore \*\/\}\s*<Chessboard\s*position=\{chess\.fen\(\)\}\s*boardOrientation="white"\s*darkSquareStyle=\{theme\.darkSquareStyle\}\s*lightSquareStyle=\{theme\.lightSquareStyle\}\s*pieces=\{customPieces\}\s*arePiecesDraggable=\{false\}\s*\/>', replacement, code, flags=re.MULTILINE)

with open("src/components/GameReview.tsx", "w") as f:
    f.write(code)
