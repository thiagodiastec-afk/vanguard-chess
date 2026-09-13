import re

with open("src/App.tsx", "r") as f:
    code = f.read()

# Add ShieldCheck if missing
if "ShieldCheck" not in code:
    code = code.replace("import { LogIn, Menu", "import { LogIn, Menu, ShieldCheck")
    if "ShieldCheck" not in code:
        code = code.replace("from 'lucide-react'", ", ShieldCheck } from 'lucide-react'")

auth_modal_text = """                    <LogIn className="w-5 h-5" />
                    Entrar com Google
                  </button>
                  <p className="text-xs text-zinc-500 font-medium flex items-center justify-center gap-1.5 mt-4">
                    <ShieldCheck className="w-4 h-4 text-emerald-500/80" />
                    Conexão segura (Criptografia AES-256)
                  </p>"""

if "AES-256" not in code:
    code = re.sub(r'<LogIn className="w-5 h-5" />\s*Entrar com Google\s*</button>', auth_modal_text, code)

with open("src/App.tsx", "w") as f:
    f.write(code)

