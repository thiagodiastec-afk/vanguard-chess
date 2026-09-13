import re

def fix_file(filepath):
    with open(filepath, "r") as f:
        code = f.read()
    
    # Safely handle .charAt(0).toUpperCase()
    code = re.sub(r'([a-zA-Z0-9_]+)\.displayName\.charAt\(0\)\.toUpperCase\(\)', r'(\1.displayName?.charAt(0)?.toUpperCase() || "?")', code)
    
    with open(filepath, "w") as f:
        f.write(code)

fix_file("src/components/Friends.tsx")
fix_file("src/components/Lobby.tsx")
fix_file("src/App.tsx")

