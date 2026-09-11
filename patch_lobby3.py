import re

with open("src/components/Lobby.tsx", "r") as f:
    code = f.read()

code = code.replace(
    "onClick={() => currentUser ? setShowBotMenu(true) : onLoginRequest?.()}",
    "onClick={() => currentUser ? setShowBotMenu(true) : onLoginRequest?.()}"
) # Actually wait, let me just check what it was

