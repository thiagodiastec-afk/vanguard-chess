import glob

files = glob.glob("src/components/*.tsx")
for filename in files:
    with open(filename, "r") as f:
        code = f.read()
    
    code = code.replace("|| 'neo'", "|| 'classic'")
    
    with open(filename, "w") as f:
        f.write(code)

