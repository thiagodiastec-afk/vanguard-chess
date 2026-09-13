import re

with open("src/components/Login.tsx", "r") as f:
    code = f.read()

if "ShieldCheck" not in code:
    code = code.replace("import { useState } from 'react';", "import { useState } from 'react';\nimport { ShieldCheck, Lock } from 'lucide-react';")

security_notice = """          <div className="mt-8 flex flex-col items-center justify-center gap-2">
            <div className="flex items-center gap-2 text-emerald-500/80 bg-emerald-500/10 px-4 py-2 rounded-full">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Conexão Segura</span>
            </div>
            <p className="text-center text-[10px] text-zinc-500 font-medium max-w-xs mt-2">
              Seus dados são protegidos com criptografia de ponta a ponta (AES-256) na infraestrutura Google Cloud.
            </p>
          </div>
        </div>"""

if "AES-256" not in code:
    code = code.replace("        </div>", security_notice, 1)

with open("src/components/Login.tsx", "w") as f:
    f.write(code)

