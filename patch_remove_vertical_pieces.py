import re

for filename in ["src/components/ComputerGame.tsx", "src/components/Game.tsx", "src/components/LocalGame.tsx"]:
    with open(filename, "r") as f:
        code = f.read()

    # Remove the function definition entirely if it exists
    # We can just remove the calls in the JSX
    if "ComputerGame.tsx" in filename:
        code = code.replace("{renderCapturedPieces(playerColor, 'vertical')}", "")
        code = code.replace("{renderCapturedPieces(playerColor === 'w' ? 'b' : 'w', 'vertical')}", "")
    elif "Game.tsx" in filename:
        code = code.replace("{renderCapturedPieces(isWhite ? 'w' : 'b', 'vertical')}", "")
        code = code.replace("{renderCapturedPieces(isWhite ? 'b' : 'w', 'vertical')}", "")
    elif "LocalGame.tsx" in filename:
        code = code.replace("{renderCapturedPieces('w', 'vertical')}", "")
        code = code.replace("{renderCapturedPieces('b', 'vertical')}", "")

    with open(filename, "w") as f:
        f.write(code)

