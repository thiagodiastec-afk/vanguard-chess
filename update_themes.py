with open("src/lib/themes.ts", "r") as f:
    code = f.read()

# Replace Theme type
code = code.replace("export type Theme = {\n  id: string;", "export type Theme = {\n  id: string;\n  pieceSet?: string;\n")

# Now inject pieceSet into the themes
replacements = {
    "name: 'Premium Luxo',": "name: 'Premium Luxo',\n    pieceSet: 'neo',",
    "name: 'Clássico (Verde)',": "name: 'Clássico (Verde)',\n    pieceSet: 'classic',",
    "name: 'Madeira',": "name: 'Madeira',\n    pieceSet: 'wood',",
    "name: 'Azul Oceano',": "name: 'Azul Oceano',\n    pieceSet: 'icy_sea',",
    "name: 'Coral',": "name: 'Coral',\n    pieceSet: 'bases',",
    "name: 'Noturno',": "name: 'Noturno',\n    pieceSet: 'alpha',",
    "name: 'Cyberpunk Neon',": "name: 'Cyberpunk Neon',\n    pieceSet: 'neon',",
    "name: 'Mármore Imperial',": "name: 'Mármore Imperial',\n    pieceSet: 'marble',",
    "name: 'Ouro e Ônix',": "name: 'Ouro e Ônix',\n    pieceSet: 'glass',",
    "name: 'Ametista Real',": "name: 'Ametista Real',\n    pieceSet: 'gothic',",
    "name: 'Floresta Élfica',": "name: 'Floresta Élfica',\n    pieceSet: 'nature',",
    "name: 'Rubi e Gelo',": "name: 'Rubi e Gelo',\n    pieceSet: 'icy_sea',",
    "name: 'Obsidiana e Cobre',": "name: 'Obsidiana e Cobre',\n    pieceSet: 'metal',",
    "name: 'Nebulosa Infinita',": "name: 'Nebulosa Infinita',\n    pieceSet: 'space',"
}

for old, new in replacements.items():
    code = code.replace(old, new)

with open("src/lib/themes.ts", "w") as f:
    f.write(code)

