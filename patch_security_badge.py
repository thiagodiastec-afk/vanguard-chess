import re

with open("src/App.tsx", "r") as f:
    code = f.read()

# Add ShieldCheck to lucide-react imports
if "ShieldCheck" not in code:
    code = code.replace("import { Play, Settings, Info", "import { Play, Settings, Info, ShieldCheck")
    if "import { Play, Settings" not in code:
        # fallback
        code = code.replace("from 'lucide-react'", ", ShieldCheck } from 'lucide-react'")
        code = code.replace("}, ShieldCheck", ", ShieldCheck")

security_badge = """
            <div className="flex items-center justify-center gap-2 mt-8 pb-8 text-zinc-500">
              <ShieldCheck className="w-4 h-4 text-emerald-500/70" />
              <span className="text-xs font-medium">Ambiente Seguro & Criptografado ponta-a-ponta</span>
            </div>
          </div>
        ) : (
"""

if "Ambiente Seguro & Criptografado" not in code:
    code = code.replace("          </div>\n        ) : (", security_badge)
    
with open("src/App.tsx", "w") as f:
    f.write(code)

