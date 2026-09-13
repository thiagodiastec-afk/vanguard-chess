with open("src/lib/themes.ts", "r") as f:
    content = f.read()

import re
# Find anything like "    lightSquareStyle: ... description: ... }," that does NOT have an "id:" before it and remove it.
# Actually, I'll just replace that exact string
bad_string = """        lightSquareStyle: { backgroundColor: '#dca46c' },
    boardWrapperClass: 'border-[12px] border-[#5e3219] ring-2 ring-[#3b1d0d] shadow-[0_15px_30px_rgba(0,0,0,0.5)]',
    price: 0,
    description: 'Tabuleiro clássico de madeira e peças realistas.',
  },"""

content = content.replace(bad_string, "")
with open("src/lib/themes.ts", "w") as f:
    f.write(content)

