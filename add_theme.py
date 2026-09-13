import re
with open("src/lib/themes.ts", "r") as f:
    content = f.read()

new_theme = """  {
    id: 'vidro',
    name: 'Metálico Premium',
    pieceSet: 'glass',
    darkSquareStyle: { backgroundColor: '#422410' },
    lightSquareStyle: { backgroundColor: '#dca46c' },
    boardWrapperClass: 'border-[12px] border-[#5e3219] ring-2 ring-[#3b1d0d] shadow-[0_15px_30px_rgba(0,0,0,0.5)]',
    price: 0,
    description: 'Tabuleiro de madeira escuro com peças metálicas/vidro realistas.',
  },"""

# Insert after classic
content = content.replace("description: 'O visual tradicional esverdeado.',\n  },", "description: 'O visual tradicional esverdeado.',\n  },\n" + new_theme)

with open("src/lib/themes.ts", "w") as f:
    f.write(content)
