with open("src/components/Game.tsx", "r") as f:
    content = f.read()

content = content.replace("import { useTheme }", "import { useTheme, CHESS_THEMES }")
content = content.replace("const theme = useTheme();", "const localTheme = useTheme();\n  const theme = React.useMemo(() => CHESS_THEMES.find(t => t.id === game.whiteThemeId) || localTheme, [game.whiteThemeId, localTheme]);")

with open("src/components/Game.tsx", "w") as f:
    f.write(content)
