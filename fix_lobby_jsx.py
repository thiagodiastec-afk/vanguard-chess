import re

with open("src/components/Lobby.tsx", "r") as f:
    code = f.read()

# Let's count the number of opening and closing braces {}
# Wait, JSX error "Unexpected end of file before a closing div tag" means a </div> is missing.
# Let's append an extra </div> before `  );` just to see if it fixes it.

code = code.replace("  );\n}", "    </div>\n  );\n}")

with open("src/components/Lobby.tsx", "w") as f:
    f.write(code)

