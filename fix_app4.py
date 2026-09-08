with open("src/App.tsx", "r") as f:
    code = f.read()

import re

# We will replace lines 223 to 226
code = re.sub(r'        \}\);\n    \}\);\n  \}, \[\]\);\n', 
"""        } else {
          setUserData(null);
          setLoading(false);
        }
      });
      return () => unsubscribeAuth();
    });
  }, []);
""", code)

with open("src/App.tsx", "w") as f:
    f.write(code)
