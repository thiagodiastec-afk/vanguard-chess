import re
with open("src/components/AdBanner.tsx", "r") as f:
    code = f.read()

code = code.replace("import { X, ExternalLink } from 'lucide-react';", "import { X, ExternalLink, Laptop, Wrench } from 'lucide-react';")

code = code.replace("""<div className="w-12 h-12 bg-neutral-900 rounded-lg flex items-center justify-center flex-shrink-0 border border-neutral-700">
          <span className="text-xl">🚀</span>
        </div>""", """<div className="w-12 h-12 bg-gradient-to-br from-indigo-500/20 to-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 border border-indigo-500/30">
          <div className="flex relative">
            <Laptop className="w-6 h-6 text-indigo-400" />
            <Wrench className="w-3 h-3 text-blue-400 absolute -bottom-1 -right-1" />
          </div>
        </div>""")

code = code.replace("Torne-se um Mestre do Xadrez mais Rápido!", "Prisma Help Desk - Soluções em Informática")
code = code.replace("Aprenda aberturas matadoras e táticas avançadas com o nosso curso completo.", "Manutenção especializada e venda de computadores e notebooks de alta performance.")

with open("src/components/AdBanner.tsx", "w") as f:
    f.write(code)
