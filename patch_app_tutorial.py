with open("src/App.tsx", "r") as f:
    code = f.read()

# Add import if missing
if "import Tutorial from" not in code:
    code = code.replace("import NicknameModal from './components/NicknameModal';", "import NicknameModal from './components/NicknameModal';\nimport Tutorial from './components/Tutorial';")

# Add Tutorial just inside the main div
search_str = "style={currentBackground.style}>"
replace_str = "style={currentBackground.style}>\n      <Tutorial inGame={!!activeGame || !!spectatingGame || isLocalGame || computerGameDifficulty !== null} />"

code = code.replace(search_str, replace_str)

with open("src/App.tsx", "w") as f:
    f.write(code)

