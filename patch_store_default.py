with open("src/components/Store.tsx", "r") as f:
    code = f.read()

code = code.replace("currentUser.activeTheme || 'luxury'", "currentUser.activeTheme || 'classic'")
code = code.replace("!currentUser.activeTheme && theme.id === 'luxury'", "!currentUser.activeTheme && theme.id === 'classic'")

with open("src/components/Store.tsx", "w") as f:
    f.write(code)

