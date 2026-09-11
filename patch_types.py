import re

with open("src/types.ts", "r") as f:
    code = f.read()

if "unlockedBackgrounds?:" not in code:
    code = code.replace("unlockedThemes: string[];", "unlockedThemes: string[];\n  unlockedBackgrounds?: string[];\n  activeBackground?: string;")

with open("src/types.ts", "w") as f:
    f.write(code)

with open("src/App.tsx", "r") as f:
    app_code = f.read()

if "unlockedBackgrounds: ['default']" not in app_code:
    app_code = app_code.replace("unlockedThemes: ['luxury', 'classic']", "unlockedThemes: ['luxury', 'classic'],\n              unlockedBackgrounds: ['default'],\n              activeBackground: 'default'")

with open("src/App.tsx", "w") as f:
    f.write(app_code)

