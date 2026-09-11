import re

with open("src/components/Lobby.tsx", "r") as f:
    code = f.read()

code = code.replace("onPlayComputer('medium')", "currentUser ? onPlayComputer('medium') : onLoginRequest()")
code = code.replace("onPlayLocal()", "currentUser ? onPlayLocal() : onLoginRequest()")
code = code.replace("handleCreateGame()", "currentUser ? handleCreateGame() : onLoginRequest()")

with open("src/components/Lobby.tsx", "w") as f:
    f.write(code)

