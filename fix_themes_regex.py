import re
with open("src/lib/themes.ts", "r") as f:
    content = f.read()

content = re.sub(r"          lightSquareStyle: \{ backgroundColor: '#dca46c' \},\n    boardWrapperClass: 'border-\[12px\] border-\[\#5e3219\] ring-2 ring-\[\#3b1d0d\] shadow-\[0_15px_30px_rgba\(0,0,0,0\.5\)\]',\n    price: 0,\n    description: 'Tabuleiro clássico de madeira e peças realistas\.',\n  \},", "", content)

with open("src/lib/themes.ts", "w") as f:
    f.write(content)
