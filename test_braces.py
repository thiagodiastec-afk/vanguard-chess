with open('src/App.tsx', 'r') as f:
    code = f.read()

stack = []
for i, c in enumerate(code):
    line = code[:i].count('\n') + 1
    if c in '{([':
        stack.append((c, line))
    elif c in '})]':
        if not stack:
            print(f"Extra {c} at line {line}")
            continue
        last, l_line = stack.pop()
        if (c == '}' and last != '{') or (c == ')' and last != '(') or (c == ']' and last != '['):
            print(f"Mismatch {c} at line {line} (last opened {last} at line {l_line})")

print(f"Left in stack: {len(stack)}")
for item in stack:
    print(item)
