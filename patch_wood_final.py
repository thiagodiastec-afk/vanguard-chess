with open("src/lib/themes.ts", "r") as f:
    content = f.read()

content = content.replace("darkSquareStyle: { backgroundColor: '#2b211a' }", "darkSquareStyle: { backgroundColor: '#1a1817' }")
content = content.replace("lightSquareStyle: { backgroundColor: '#d1a473' }", "lightSquareStyle: { backgroundColor: '#e2c596' }")
content = content.replace("this.currentTheme = CHESS_THEMES.find(t => t.id === 'luxury') || CHESS_THEMES[0];", "this.currentTheme = CHESS_THEMES.find(t => t.id === 'wood') || CHESS_THEMES[2];")
# Remove boardWrapperClass since it's hardcoded in ComputerGame anyway
content = content.replace("    boardWrapperClass: 'border-[8px] border-[#312015] ring-1 ring-[#c09060]',\n", "")

with open("src/lib/themes.ts", "w") as f:
    f.write(content)
