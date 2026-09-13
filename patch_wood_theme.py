import re

with open("src/lib/themes.ts", "r") as f:
    content = f.read()

# I want to add boardWrapperClass to Theme type
if "boardWrapperClass?: string;" not in content:
    content = content.replace("pieceSet?: string;", "pieceSet?: string;\n  boardWrapperClass?: string;")

# Replace wood theme colors
new_wood_theme = """  {
    id: 'wood',
    name: 'Madeira',
    pieceSet: 'wood',
    darkSquareStyle: { backgroundColor: '#2b211a' },
    lightSquareStyle: { backgroundColor: '#d1a473' },
    boardWrapperClass: 'border-[8px] border-[#312015] ring-1 ring-[#c09060]',
    price: 0,
    description: 'Tabuleiro clássico de madeira e peças entalhadas.',
  },"""

content = re.sub(r"\{\s*id:\s*'wood'[\s\S]*?\},", new_wood_theme, content)

# Change price of luxury so it's not the default
content = content.replace("name: 'Premium Luxo',\n    pieceSet: 'neo',\n    darkSquareStyle: { backgroundColor: '#1a1817' },\n    lightSquareStyle: { backgroundColor: '#e2c596' },\n    price: 0,", "name: 'Premium Luxo',\n    pieceSet: 'neo',\n    darkSquareStyle: { backgroundColor: '#1a1817' },\n    lightSquareStyle: { backgroundColor: '#e2c596' },\n    price: 300,")

with open("src/lib/themes.ts", "w") as f:
    f.write(content)

