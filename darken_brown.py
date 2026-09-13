with open("src/lib/themes.ts", "r") as f:
    content = f.read()

content = content.replace("darkSquareStyle: { backgroundColor: '#733e1c' }", "darkSquareStyle: { backgroundColor: '#422410' }")

with open("src/lib/themes.ts", "w") as f:
    f.write(content)
