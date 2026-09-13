with open("src/components/Store.tsx", "r") as f:
    content = f.read()

content = content.replace("if (!unlockedThemes.includes(themeId)) return;", "const theme = CHESS_THEMES.find(t => t.id === themeId);\n    if (!unlockedThemes.includes(themeId) && theme?.price !== 0) return;")

with open("src/components/Store.tsx", "w") as f:
    f.write(content)
