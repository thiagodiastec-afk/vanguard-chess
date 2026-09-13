with open("src/types.ts", "r") as f:
    code = f.read()

code = code.replace("displayName: string;", "displayName: string;\n  hasSetNickname?: boolean;")

with open("src/types.ts", "w") as f:
    f.write(code)
