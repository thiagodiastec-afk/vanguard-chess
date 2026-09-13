with open("src/components/Lobby.tsx", "r") as f:
    code = f.read()

# Add ids
code = code.replace("onClick={() => currentUser ? setShowBotMenu(true) : onLoginRequest?.()}", 
                    "id=\"tutorial-play-ai\"\n                    onClick={() => currentUser ? setShowBotMenu(true) : onLoginRequest?.()}")
                    
code = code.replace("onClick={() => alert('Em breve!')}",
                    "id=\"tutorial-play-friend\"\n                    onClick={() => alert('Em breve!')}")
                    
code = code.replace("onClick={onPlayLocal}",
                    "id=\"tutorial-pass-play\"\n          onClick={onPlayLocal}")

with open("src/components/Lobby.tsx", "w") as f:
    f.write(code)

