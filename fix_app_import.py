import re

with open("src/App.tsx", "r") as f:
    code = f.read()

# Fix the import error: `} , ShieldCheck } from 'lucide-react'`
code = code.replace("} , ShieldCheck }", ", ShieldCheck }")

with open("src/App.tsx", "w") as f:
    f.write(code)

