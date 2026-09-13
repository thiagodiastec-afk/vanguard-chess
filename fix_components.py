import glob

files = glob.glob("src/components/*.tsx")
for filename in files:
    with open(filename, "r") as f:
        code = f.read()
    
    code = code.replace("|| 'wood')", "|| '3d_staunton')")
    
    with open(filename, "w") as f:
        f.write(code)

with open("src/components/Store.tsx", "r") as f:
    code = f.read()

code = code.replace("currentUser.activeTheme || 'wood'", "currentUser.activeTheme || 'luxury'")
code = code.replace("!currentUser.activeTheme && theme.id === 'wood'", "!currentUser.activeTheme && theme.id === 'luxury'")
with open("src/components/Store.tsx", "w") as f:
    f.write(code)

