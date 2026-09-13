import re

with open("src/lib/themes.ts", "r") as f:
    code = f.read()

replacements = {
    "pieceSet: 'nature'": "pieceSet: 'club'",
    "pieceSet: 'metal'": "pieceSet: 'cases'",
    "pieceSet: 'space'": "pieceSet: 'graffiti'"
}

for old, new in replacements.items():
    code = code.replace(old, new)

with open("src/lib/themes.ts", "w") as f:
    f.write(code)
