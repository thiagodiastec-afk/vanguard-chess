import re

# 1. Store.tsx
with open("src/components/Store.tsx", "r") as f:
    code = f.read()

code = code.replace("import { customPieces } from '../lib/chessPieces';", "import { getCustomPieces } from '../lib/chessPieces';")
code = code.replace("pieces: customPieces,", "pieces: getCustomPieces(previewTheme?.pieceSet || 'classic'),")

with open("src/components/Store.tsx", "w") as f:
    f.write(code)

# 2. GameReview.tsx
with open("src/components/GameReview.tsx", "r") as f:
    code = f.read()

code = code.replace("import { customPieces } from '../lib/chessPieces';", "import { getCustomPieces } from '../lib/chessPieces';")
code = code.replace("pieces: customPieces", "pieces: getCustomPieces(theme.pieceSet || 'classic')")

with open("src/components/GameReview.tsx", "w") as f:
    f.write(code)

# 3. Training.tsx
with open("src/components/Training.tsx", "r") as f:
    code = f.read()

code = code.replace("import { customPieces } from '../lib/chessPieces';", "import { getCustomPieces } from '../lib/chessPieces';")
code = code.replace("pieces: customPieces,", "pieces: getCustomPieces(theme.pieceSet || 'classic'),")

with open("src/components/Training.tsx", "w") as f:
    f.write(code)

