import re

# 1. themes.ts
with open("src/lib/themes.ts", "r") as f:
    code = f.read()
code = code.replace("CHESS_THEMES.find(t => t.id === 'luxury') || CHESS_THEMES[0]",
                    "CHESS_THEMES.find(t => t.id === 'classic') || CHESS_THEMES[1]")
with open("src/lib/themes.ts", "w") as f:
    f.write(code)

# 2. Store.tsx
with open("src/components/Store.tsx", "r") as f:
    code = f.read()
code = code.replace("currentUser.activeTheme || 'luxury'", "currentUser.activeTheme || 'classic'")
code = code.replace("!currentUser.activeTheme && theme.id === 'luxury'", "!currentUser.activeTheme && theme.id === 'classic'")
with open("src/components/Store.tsx", "w") as f:
    f.write(code)

