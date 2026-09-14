with open("src/components/Game.tsx", "r") as f:
    content = f.read()

content = content.replace("import { Flag, Handshake", "import { Flag, Eye, Handshake")

with open("src/components/Game.tsx", "w") as f:
    f.write(content)
