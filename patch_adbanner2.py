import re
with open("src/components/AdBanner.tsx", "r") as f:
    code = f.read()

code = code.replace('className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors flex-shrink-0"',
                    'className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors flex-shrink-0"')

code = code.replace('className="bg-emerald-900/40 text-emerald-400 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-emerald-500/20 absolute top-2 left-2 sm:static"',
                    'className="bg-indigo-900/40 text-indigo-400 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-indigo-500/20 absolute top-2 left-2 sm:static"')

with open("src/components/AdBanner.tsx", "w") as f:
    f.write(code)
