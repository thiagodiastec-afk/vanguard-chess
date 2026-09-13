import re

def fix_pieces(filepath):
    with open(filepath, "r") as f:
        code = f.read()

    code = code.replace("pieces: customPieces,", "customPieces: getCustomPieces(theme.pieceSet || 'neo'),")
    code = code.replace("pieces: customPieces", "customPieces: getCustomPieces(theme.pieceSet || 'neo')")
    code = code.replace("import { customPieces } from '../lib/chessPieces';", "import { getCustomPieces } from '../lib/chessPieces';")

    with open(filepath, "w") as f:
        f.write(code)

fix_pieces("src/components/Game.tsx")
fix_pieces("src/components/ComputerGame.tsx")
fix_pieces("src/components/LocalGame.tsx")

