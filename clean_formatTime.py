import re
with open("src/components/Game.tsx", "r") as f:
    code = f.read()

# Find all occurrences of the block and replace them with just "  return ("
block_pattern = re.compile(r'  const formatTime = \(seconds: number\) => \{\n    if \(isNaN\(seconds\) \|\| seconds < 0\) seconds = 0;\n    const m = Math\.floor\(seconds / 60\);\n    const s = Math\.floor\(seconds % 60\);\n    return `\$\{m\}:\$\{s\.toString\(\)\.padStart\(2, \'0\'\)\}`;\n  \}\n\n  return \(')

code = block_pattern.sub('  return (', code)

# Now, add it only ONCE, right before the MAIN component return.
# The main component return is preceded by `  const handleGameEnd = ` or similar. Let's find the last `  return (`
returns = list(re.finditer(r'^  return \(', code, re.MULTILINE))
if returns:
    last_return = returns[-1]
    insertion_point = last_return.start()
    
    code = code[:insertion_point] + """  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) seconds = 0;
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

""" + code[insertion_point:]

with open("src/components/Game.tsx", "w") as f:
    f.write(code)

