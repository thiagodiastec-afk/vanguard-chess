import glob

# Fix pieces property in all components
files = glob.glob("src/components/*.tsx")
for filename in files:
    with open(filename, "r") as f:
        code = f.read()
    
    code = code.replace("// @ts-ignore\n            customPieces: getCustomPieces", "pieces: getCustomPieces")
    code = code.replace("|| 'neo')", "|| 'wood')")
    
    with open(filename, "w") as f:
        f.write(code)

# Update themes.ts
with open("src/lib/themes.ts", "r") as f:
    code = f.read()

# Make 'wood' the default theme
code = code.replace("CHESS_THEMES.find(t => t.id === 'luxury') || CHESS_THEMES[0]",
                    "CHESS_THEMES.find(t => t.id === 'wood') || CHESS_THEMES[2]")

# Update Store defaults
with open("src/components/Store.tsx", "r") as f:
    code = f.read()
code = code.replace("currentUser.activeTheme || 'luxury'", "currentUser.activeTheme || 'wood'")
code = code.replace("!currentUser.activeTheme && theme.id === 'luxury'", "!currentUser.activeTheme && theme.id === 'wood'")
# Also ensure unlockedThemes includes 'wood'
code = code.replace("['luxury', 'classic']", "['luxury', 'classic', 'wood']")

with open("src/components/Store.tsx", "w") as f:
    f.write(code)

