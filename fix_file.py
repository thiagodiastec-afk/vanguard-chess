import re
with open("src/lib/backgrounds.ts", "r") as f:
    text = f.read()

text = text.replace("  },\n  }\n\n  {\n    id: 'default',", "  },\n  {\n    id: 'default',")

with open("src/lib/backgrounds.ts", "w") as f:
    f.write(text)
