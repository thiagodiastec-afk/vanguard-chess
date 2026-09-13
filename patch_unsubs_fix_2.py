with open("src/App.tsx", "r") as f:
    content = f.read()

content = content.replace("                  updateDoc(doc(db, 'challenges', change.doc.id), { status: 'completed' });\n                }\n              }\n            });\n          });", "                  updateDoc(doc(db, 'challenges', change.doc.id), { status: 'completed' });\n                }\n              }\n            });\n          }));")

with open("src/App.tsx", "w") as f:
    f.write(content)
