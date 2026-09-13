import glob

# 1. Revert pieces default fallback
files = glob.glob("src/components/*.tsx")
for filename in files:
    with open(filename, "r") as f:
        code = f.read()
    
    code = code.replace("getCustomPieces(theme.pieceSet || 'classic')", "getCustomPieces(theme.pieceSet || 'neo')")
    code = code.replace("getCustomPieces(previewTheme?.pieceSet || 'classic')", "getCustomPieces(previewTheme?.pieceSet || 'neo')")
    
    with open(filename, "w") as f:
        f.write(code)

# 2. Revert themes default
with open("src/lib/themes.ts", "r") as f:
    code = f.read()
code = code.replace("CHESS_THEMES.find(t => t.id === 'classic') || CHESS_THEMES[1]",
                    "CHESS_THEMES.find(t => t.id === 'luxury') || CHESS_THEMES[0]")
with open("src/lib/themes.ts", "w") as f:
    f.write(code)

# 3. Revert Store defaults
with open("src/components/Store.tsx", "r") as f:
    code = f.read()
code = code.replace("currentUser.activeTheme || 'classic'", "currentUser.activeTheme || 'luxury'")
code = code.replace("!currentUser.activeTheme && theme.id === 'classic'", "!currentUser.activeTheme && theme.id === 'luxury'")
with open("src/components/Store.tsx", "w") as f:
    f.write(code)

# 4. Revert chessPieces.tsx definition
with open("src/lib/chessPieces.tsx", "r") as f:
    code = f.read()
code = code.replace("pieceSet: string = 'classic'", "pieceSet: string = 'neo'")
with open("src/lib/chessPieces.tsx", "w") as f:
    f.write(code)

