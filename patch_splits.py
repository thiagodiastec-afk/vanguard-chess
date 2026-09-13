import re

def fix_file(filepath, replacements):
    with open(filepath, "r") as f:
        code = f.read()
    
    for old, new in replacements:
        code = code.replace(old, new)
        
    with open(filepath, "w") as f:
        f.write(code)

fix_file("src/components/Lobby.tsx", [
    ("{user.displayName.split(' ')[0]}", "{(user.displayName || 'Jogador').split(' ')[0]}"),
    ("{user.displayName?.charAt(0)?.toUpperCase() || \"?\"}", "{(user.displayName || 'Jogador').charAt(0).toUpperCase()}") # fix charAt just in case
])

fix_file("src/components/ComputerGame.tsx", [
    ("{analysis.split('\\n').map((paragraph, idx) => (", "{(analysis || '').split('\\n').map((paragraph, idx) => (")
])

fix_file("src/components/Game.tsx", [
    ("{whiteName.split(' ')[0]}", "{(whiteName || 'Brancas').split(' ')[0]}"),
    ("{blackName.split(' ')[0]}", "{(blackName || 'Pretas').split(' ')[0]}")
])

fix_file("src/components/Friends.tsx", [
    ("{friend.displayName?.charAt(0)?.toUpperCase() || \"?\"}", "{(friend.displayName || '?').charAt(0).toUpperCase()}"),
    ("{user.displayName?.charAt(0)?.toUpperCase() || \"?\"}", "{(user.displayName || '?').charAt(0).toUpperCase()}")
])

fix_file("src/App.tsx", [
    ("{userData.displayName?.charAt(0)?.toUpperCase() || \"?\"}", "{(userData.displayName || '?').charAt(0).toUpperCase()}")
])

