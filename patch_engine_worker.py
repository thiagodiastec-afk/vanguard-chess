import re

with open("src/lib/engine.ts", "r") as f:
    code = f.read()

# We need to decrease the depth slightly for faster performance, because the TS engine is unoptimized.
# Profissional depth = 4 in raw TS minimax takes a very long time. Let's drop it to 3, and add better heuristics.
# Depth 3 takes ~0.5s in JS, Depth 4 takes ~10-20s.

code = code.replace("else if (difficulty === 'profissional') depth = 4;", "else if (difficulty === 'profissional') depth = 3;")
code = code.replace("else if (difficulty === 'dificil') depth = 3;", "else if (difficulty === 'dificil') depth = 3;") # Keep 3, but maybe limit time?

with open("src/lib/engine.ts", "w") as f:
    f.write(code)

