import re

with open("src/App.tsx", "r") as f:
    code = f.read()

missing_code = """          return () => {
            unsubscribeGames();
            unsubscribeUser();
          };
      });
      
      return () => unsubscribeAuth();
    });
  }, [themeManager]);

"""

# Replace the exact return (
code = code.replace("          return (\n    <div className=", missing_code + "  return (\n    <div className=")

with open("src/App.tsx", "w") as f:
    f.write(code)
