import re
with open("src/components/Lobby.tsx", "r") as f:
    content = f.read()

# For invite match
content = content.replace("turn: 'w',", "turn: 'w',\n        whiteThemeId: currentUser.activeTheme || 'luxury',")

# For matchmaking queue
content = content.replace("timeControl\n      });", "timeControl,\n        activeTheme: currentUser.activeTheme || 'luxury'\n      });")

# For matchmaking transaction game creation
content = content.replace("turn: 'w'\n            });", "turn: 'w',\n              whiteThemeId: whitePlayer!.activeTheme || 'luxury'\n            });")

with open("src/components/Lobby.tsx", "w") as f:
    f.write(content)
