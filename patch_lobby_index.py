with open("src/components/Lobby.tsx", "r") as f:
    content = f.read()

content = content.replace("orderBy('lastSeen', 'desc'),\n      limit(20)", "limit(50) // Removed orderBy to avoid requiring composite index without manual creation")

with open("src/components/Lobby.tsx", "w") as f:
    f.write(content)
