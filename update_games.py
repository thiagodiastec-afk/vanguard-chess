import re

def replace_in_file(filepath):
    with open(filepath, "r") as f:
        code = f.read()

    # Import getCustomPieces instead of customPieces
    code = code.replace("import { customPieces } from '../lib/chessPieces';", "import { getCustomPieces } from '../lib/chessPieces';")
    code = code.replace("import { customPieces, boardStyles } from '../lib/chessPieces';", "import { getCustomPieces, boardStyles } from '../lib/chessPieces';")

    # Pass the current theme's pieceSet
    code = code.replace("customPieces={customPieces}", "customPieces={getCustomPieces(currentTheme.pieceSet || 'neo')}")
    
    # Or if it's passed as pieces={customPieces}
    code = code.replace("pieces={customPieces}", "customPieces={getCustomPieces(currentTheme.pieceSet || 'neo')}")
    
    with open(filepath, "w") as f:
        f.write(code)

replace_in_file("src/components/Game.tsx")
replace_in_file("src/components/ComputerGame.tsx")
replace_in_file("src/components/LocalGame.tsx")

