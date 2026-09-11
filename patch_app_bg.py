import re

with open("src/App.tsx", "r") as f:
    code = f.read()

# 1. Add import for useBackground
if "import { backgroundManager, useBackground } from './lib/backgrounds';" not in code:
    code = code.replace("import { themeManager, CHESS_THEMES, useTheme } from './lib/themes';", "import { themeManager, CHESS_THEMES, useTheme } from './lib/themes';\nimport { backgroundManager, useBackground } from './lib/backgrounds';")

# 2. Add useBackground hook call
if "const currentBackground = useBackground();" not in code:
    code = code.replace("const currentTheme = useTheme();", "const currentTheme = useTheme();\n  const currentBackground = useBackground();")

# 3. Update the root div
# Search for <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col md:flex-row font-sans selection:bg-emerald-500/30">
old_div = '<div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col md:flex-row font-sans selection:bg-emerald-500/30">'
new_div = '<div className={cn("min-h-screen text-zinc-50 flex flex-col md:flex-row font-sans selection:bg-emerald-500/30", currentBackground.className || "")} style={currentBackground.style}>'

code = code.replace(old_div, new_div)

# 4. Make sure user state pulls activeBackground
if "if (data.activeTheme && data.activeTheme !== themeManager.getTheme().id) {" in code:
    old_sync = """              if (data.activeTheme && data.activeTheme !== themeManager.getTheme().id) {
                themeManager.setTheme(data.activeTheme);
              }"""
    new_sync = """              if (data.activeTheme && data.activeTheme !== themeManager.getTheme().id) {
                themeManager.setTheme(data.activeTheme);
              }
              if (data.activeBackground && data.activeBackground !== backgroundManager.getBackground().id) {
                backgroundManager.setBackground(data.activeBackground);
              }"""
    code = code.replace(old_sync, new_sync)

with open("src/App.tsx", "w") as f:
    f.write(code)

