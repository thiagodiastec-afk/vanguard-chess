import re

with open("src/components/LocalGame.tsx", "r") as f:
    code = f.read()

# Remove the handleUndo function
code = re.sub(r'  const handleUndo = \(\) => \{.*?\};\n', '', code, flags=re.DOTALL)

# Remove the Undo button
button_pattern = r'              <button\s+onClick=\{handleUndo\}\s+disabled=\{game\.history\(\)\.length === 0\}\s+className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"\s+title="Desfazer Lance"\s+>\s+<Undo className="w-4 h-4" />\s+</button>'
code = re.sub(button_pattern, '', code, flags=re.DOTALL)

with open("src/components/LocalGame.tsx", "w") as f:
    f.write(code)

