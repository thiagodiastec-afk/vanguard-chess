with open("src/App.tsx", "r") as f:
    code = f.read()

# I will replace from 223 to 232 with correct closing
import re

code = re.sub(r'          return \(\) => \{\n            unsubscribeGames\(\);\n            unsubscribeUser\(\);\n          \};\n      \}\);\n      \n      return \(\) => unsubscribeAuth\(\);\n    \}\);\n  \}, \[themeManager\]\);\n\n', 
"""        });
    });
  }, []);
  
""", code)

# Remove the extra `}` at the end
code = code.rstrip()
if code.endswith('}'):
    code = code[:-1]

with open("src/App.tsx", "w") as f:
    f.write(code)
