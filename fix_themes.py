with open("src/lib/themes.ts", "r") as f:
    content = f.read()

content = content.replace("""    lightSquareStyle: { backgroundColor: '#e2c596' },
    price: 0,
    description: 'Tabuleiro clássico de madeira e peças entalhadas.',
  },""", "")

with open("src/lib/themes.ts", "w") as f:
    f.write(content)
