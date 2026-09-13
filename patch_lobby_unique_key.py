with open("src/components/Lobby.tsx", "r") as f:
    code = f.read()

# Fix onlineUsers building
code = code.replace("const data = doc.data() as UserData;\n        if (!data.uid) data.uid = doc.id;\n        if (data.uid !== currentUser?.uid) { // Optional: exclude self, or keep it. Let's keep it but mark it. \n           users.push(data);\n        }",
                    "const data = doc.data() as UserData;\n        data.uid = doc.id; // Force uniqueness\n        if (data.uid !== currentUser?.uid) {\n           users.push(data);\n        }")

# Remove old if it failed
code = code.replace("const data = doc.data() as UserData;\n        if (!data.uid) data.uid = doc.id;\n        if (data.uid !== currentUser?.uid) { \n           users.push(data);\n        }",
                    "const data = doc.data() as UserData;\n        data.uid = doc.id; // Force uniqueness\n        if (data.uid !== currentUser?.uid) {\n           users.push(data);\n        }")

with open("src/components/Lobby.tsx", "w") as f:
    f.write(code)

