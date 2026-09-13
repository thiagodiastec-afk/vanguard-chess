import re

with open("src/lib/themes.ts", "r") as f:
    content = f.read()

new_wood_theme = """  {
    id: 'wood',
    name: 'Madeira Clássica',
    pieceSet: '3d_wood',
    darkSquareStyle: { backgroundColor: '#733e1c' },
    lightSquareStyle: { backgroundColor: '#dca46c' },
    boardWrapperClass: 'border-[12px] border-[#5e3219] ring-2 ring-[#3b1d0d] shadow-[0_15px_30px_rgba(0,0,0,0.5)]',
    price: 0,
    description: 'Tabuleiro clássico de madeira e peças realistas.',
  },"""

content = re.sub(r"\{\s*id:\s*'wood'[\s\S]*?\},", new_wood_theme, content)

with open("src/lib/themes.ts", "w") as f:
    f.write(content)
