import re

with open("src/components/Lobby.tsx", "r") as f:
    code = f.read()

code = code.replace("onClick={() => setShowBotMenu(true)}", "onClick={() => currentUser ? setShowBotMenu(true) : onLoginRequest?.()}")
code = code.replace("onClick={() => onPlayLocal?.()}", "onClick={() => currentUser ? onPlayLocal?.() : onLoginRequest?.()}")
code = code.replace("onClick={handleCreateGame}", "onClick={currentUser ? handleCreateGame : onLoginRequest}")

with open("src/components/Lobby.tsx", "w") as f:
    f.write(code)

