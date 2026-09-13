import glob

for filename in glob.glob("src/components/*Game.tsx") + ["src/components/Game.tsx"]:
    with open(filename, "r") as f:
        code = f.read()
    
    code = code.replace("customPieces:", "pieces:")
    
    with open(filename, "w") as f:
        f.write(code)
