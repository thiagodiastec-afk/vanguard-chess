with open("src/lib/themes.ts", "r") as f:
    content = f.read()

# I want to replace the first theme (luxury) with the wood specs
new_luxury = """  {
    id: 'luxury',
    name: 'Madeira Clássica',
    pieceSet: '3d_staunton',
    darkSquareStyle: { backgroundColor: '#733e1c' },
    lightSquareStyle: { backgroundColor: '#dca46c' },
    boardWrapperClass: 'border-[12px] border-[#5e3219] ring-2 ring-[#3b1d0d] shadow-[0_15px_30px_rgba(0,0,0,0.5)]',
    price: 0,
    description: 'Tabuleiro clássico de madeira e peças realistas.',
  },"""

import re
content = re.sub(r"\{\s*id:\s*'luxury'[\s\S]*?\},", new_luxury, content)

# Remove the old wood theme
content = re.sub(r"\{\s*id:\s*'wood'[\s\S]*?\},", "", content)

# Fix ThemeManager default to 'luxury'
content = content.replace("this.currentTheme = CHESS_THEMES.find(t => t.id === 'wood') || CHESS_THEMES[2];", "this.currentTheme = CHESS_THEMES.find(t => t.id === 'luxury') || CHESS_THEMES[0];")

with open("src/lib/themes.ts", "w") as f:
    f.write(content)
