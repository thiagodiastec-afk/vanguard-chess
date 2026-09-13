with open("src/lib/themes.ts", "r") as f:
    content = f.read()

content = content.replace("""    lightSquareStyle: { backgroundColor: '#e2c596' },
    price: 300,
    description: 'O tema padrão premium, clássico e elegante.',
  },""", "")

with open("src/lib/themes.ts", "w") as f:
    f.write(content)
