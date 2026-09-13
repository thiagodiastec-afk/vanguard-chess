with open("src/components/Lobby.tsx", "r") as f:
    code = f.read()

# Fix onlineUsers building
code = code.replace("const data = doc.data() as UserData;",
                    "const data = doc.data() as UserData;\n        if (!data.uid) data.uid = doc.id;")

with open("src/components/Lobby.tsx", "w") as f:
    f.write(code)

