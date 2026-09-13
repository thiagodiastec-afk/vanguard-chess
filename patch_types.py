with open("src/types.ts", "r") as f:
    content = f.read()

content = content.replace("spectatorsAllowedBlack?: boolean;", "spectatorsAllowedBlack?: boolean;\n  whiteThemeId?: string;")
content = content.replace("createdAt: number;", "createdAt: number;\n  activeTheme?: string;")

with open("src/types.ts", "w") as f:
    f.write(content)
