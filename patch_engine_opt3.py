import re

with open("src/lib/engine.ts", "r") as f:
    code = f.read()

code = code.replace("const moves = game.moves();", "let moves = game.moves();")

with open("src/lib/engine.ts", "w") as f:
    f.write(code)

