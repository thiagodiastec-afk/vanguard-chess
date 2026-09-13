import re

# 1. Restore default theme in themes.ts
with open("src/lib/themes.ts", "r") as f:
    code = f.read()

code = code.replace("CHESS_THEMES.find(t => t.id === 'classic') || CHESS_THEMES[1]",
                    "CHESS_THEMES.find(t => t.id === 'luxury') || CHESS_THEMES[0]")

with open("src/lib/themes.ts", "w") as f:
    f.write(code)

# 2. Restore default theme in Store.tsx
with open("src/components/Store.tsx", "r") as f:
    code = f.read()

code = code.replace("currentUser.activeTheme || 'classic'", "currentUser.activeTheme || 'luxury'")
code = code.replace("!currentUser.activeTheme && theme.id === 'classic'", "!currentUser.activeTheme && theme.id === 'luxury'")

with open("src/components/Store.tsx", "w") as f:
    f.write(code)

