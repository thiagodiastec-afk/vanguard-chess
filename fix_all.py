import re

with open("src/types.ts", "r") as f:
    code = f.read()
if "unlockedBackgrounds?:" not in code:
    code = code.replace("unlockedThemes: string[];", "unlockedThemes: string[];\n  unlockedBackgrounds?: string[];\n  activeBackground?: string;")
with open("src/types.ts", "w") as f:
    f.write(code)

with open("src/components/Store.tsx", "r") as f:
    store = f.read()
store = store.replace("<ImageIcon ", "<ImageIcon ") # already imported in patch_store_tabs.py? Wait, maybe it wasn't replaced correctly.
if "ImageIcon" not in store:
    store = store.replace("Clock } from 'lucide-react';", "Clock, Image as ImageIcon } from 'lucide-react';")
with open("src/components/Store.tsx", "w") as f:
    f.write(store)

with open("src/lib/backgrounds.ts", "r") as f:
    bg = f.read()
if "import React" not in bg:
    bg = "import React from 'react';\n" + bg
with open("src/lib/backgrounds.ts", "w") as f:
    f.write(bg)

