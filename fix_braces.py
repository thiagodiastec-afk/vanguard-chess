import re
with open("src/lib/backgrounds.ts", "r") as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    if line.strip() == "}" and "{" in lines[i+1] and "id: 'default'" in lines[i+2]:
        continue
    new_lines.append(line)

with open("src/lib/backgrounds.ts", "w") as f:
    f.writelines(new_lines)
